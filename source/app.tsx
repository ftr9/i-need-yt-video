import React, {useState} from 'react';
import {Box, Text, usePaste} from 'ink';
import childProcess from 'node:child_process';
import Spinner from 'ink-spinner';

const textDecoder = new TextDecoder();

const LoadingSpinnerWithText = ({children}: {children: string}) => {
	return (
		<Box>
			<Text>
				<Text color={'white'}>
					<Spinner type="dots" />
				</Text>{' '}
				{children}
			</Text>
		</Box>
	);
};

export default function App() {
	const [result, setResult] = useState('');
	const [isDownloadingLibrary, setIsDownloadingLibrary] = useState(false);
	const [isCheckingLibrary, setIsCheckingLibrary] = useState(false);
	const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
	const [downloadingText, setDownloadingText] = useState('');
	const [error, setError] = useState('');
	const [pastedText, setPastedText] = useState('');

	const handleLibraryDownload = async () => {
		return new Promise<boolean>(resolve => {
			//yt-dlp is not installed at all - try to install it
			const ytDlpInstallSubProcess = childProcess.spawn('brew', [
				'install',
				'yt-dlp',
			]);

			//installation failed
			ytDlpInstallSubProcess.on('error', () => resolve(false));

			//success installation
			ytDlpInstallSubProcess.on('close', _ => {
				resolve(true);
			});
		});
	};

	const handleVideoDownload = async (downloadUrl: string) => {
		return new Promise(resolve => {
			const downloadProcess = childProcess.spawn('yt-dlp', [
				'-f',
				'mp4',
				downloadUrl,
				'-o',
				'$HOME/Desktop/%(title)s.%(ext)s',
			]);

			downloadProcess.stdout.on('data', chunk => {
				const decodedText = textDecoder.decode(chunk);

				if (decodedText.includes('[download]')) {
					setDownloadingText(decodedText);
				}
			});

			downloadProcess.on('error', () => {
				resolve(false);
			});

			downloadProcess.on('close', () => {
				resolve(true);
			});
		});
	};

	const checkLibaryExistence = async () => {
		return new Promise<boolean>(resolve => {
			//check if yt-dlp is installed or not
			const subProcess = childProcess.spawn('yt-dlp', ['--version']);

			subProcess.stdout.on('data', () => {
				resolve(true);
			});

			subProcess.on('error', err => {
				if (err.message.includes('spawn yt-dlp ENOENT')) {
					resolve(false);
				}
			});
		});
	};

	usePaste(async pastedLink => {
		setIsCheckingLibrary(true);
		setResult('');
		setError('');
		setDownloadingText('');
		setPastedText(pastedLink);

		const hasLibraryInstalled = await checkLibaryExistence();
		setIsCheckingLibrary(false);

		if (!hasLibraryInstalled) {
			setIsDownloadingLibrary(true);
			const isLibaryDownloaded = await handleLibraryDownload();
			setIsDownloadingLibrary(false);

			if (!isLibaryDownloaded) {
				setError('Failed to setup please try again');
				return;
			}
		}

		setIsDownloadingVideo(true);
		const isVideoDownloaded = await handleVideoDownload(pastedLink);
		setIsDownloadingVideo(false);

		if (!isVideoDownloaded) {
			setError('failed to download the video');
			return;
		}

		setResult('video download successfully');
	});

	const requireLoadingDisplay =
		isDownloadingLibrary || isDownloadingVideo || isCheckingLibrary;

	const getLoadingText = () => {
		if (isDownloadingLibrary) {
			return "setting up system. don't worry this happens only one time ...";
		}

		if (isCheckingLibrary) {
			return 'Please wait ...';
		}

		if (isDownloadingVideo) {
			return downloadingText
				? downloadingText
				: 'Downloading video please wait ... ';
		}

		return '';
	};

	return (
		<Box rowGap={1} flexDirection="column">
			<Text backgroundColor={'red'}>Download youtube videos</Text>
			<Text>Paste youtube video link:</Text>

			{pastedText && <Text underline>{pastedText}</Text>}

			{requireLoadingDisplay && (
				<LoadingSpinnerWithText>{getLoadingText()}</LoadingSpinnerWithText>
			)}

			{result && (
				<>
					<Text color={'green'}>{result} ✅</Text>
					<Text>paste another url to download again .. ⬇️</Text>
				</>
			)}
			{error && <Text color={'red'}>{error}</Text>}
		</Box>
	);
}
