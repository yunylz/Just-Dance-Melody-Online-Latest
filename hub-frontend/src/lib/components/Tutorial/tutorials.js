import consoles from '$lib/consoles';

export const registrationUrl = "/login?r=true";

export const dnsPrimary = "173.249.28.254";
export const dnsSecondary = "173.249.28.254";
export const proxyIp = "173.249.28.254";
export const proxyPort = "4080";

export const welcomePages = [
	{ id: 'introduction', label: 'Introduction', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
	{ id: 'what-is-hub', label: 'What is Hub?', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
	{ id: 'compatibility', label: 'Compatibility', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
];

export const tutorialSections = [
	{ id: 'prerequisites', label: 'Prerequisites', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
	{ id: 'setup', label: 'Setup', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export const allPages = [...welcomePages, ...tutorialSections];

export const supportedPlatforms = [
	{ id: 'pc', ...consoles.pc },
	{ id: 'pc_crack', ...consoles.pcCrack },
	{ id: 'ps4', ...consoles.ps4 },
	{ id: 'ps5', ...consoles.ps5 },
	{ id: 'nx', ...consoles.nx },
	{ id: 'nx2', ...consoles.nx2 },
	{ id: 'wiiu', ...consoles.wiiu },
];

export function getPlatform(id) {
	return supportedPlatforms.find(p => p.id === id);
}

export const consoleRiskWarning = 'JDMO Team and affiliates are not responsible for any issues that may occur with your console, including but not limited to bricking or account bans. Proceed at your own risk.';
export const ps4RiskWarning = 'JDMO Team and affiliates are not responsible for any issues that may occur with your console, including but not limited to account bans. Proceed at your own risk.';
export const pcRiskWarning = 'JDMO Team and affiliates are not responsible for any issues that may occur with your setup. Proceed at your own risk.';

// ── Shared across platforms ──────────────────────
export const sharedPrerequisites = [
	{
		title: 'JDMO Hub Registration',
		description: 'You must be registered to the Hub in order to connect to JDMO.',
		link: { text: 'Register now!', url: registrationUrl }
	},
	{
		title: 'Supported Just Dance Game',
		description: 'Make sure your game is compatible with JDMO.',
		link: { text: 'See supported games.', url: '#' },
	}
];

export const sharedSteps = {
	goToSettings: {
		title: "Head to your network settings",
		details: [
			{ label: '', value: "On your console, go to the network settings and find the DNS settings." }
		]
	},
	setDns: {
		title: 'Set Custom DNS',
		details: [
			{ label: 'Primary DNS', value: dnsPrimary },
			{ label: 'Secondary DNS', value: dnsSecondary }
		]
	},
	launchGame: {
		title: 'Launch the Game',
		details: [
			{ label: '', value: 'After linking your Hub account and configuring DNS, simply start the game. Your console will connect to our servers automatically.' }
		]
	}
};

export const tutorials = {
	wiiu: {
		prerequisites: [
			...sharedPrerequisites,
			{
				title: 'Homebrewed Wii U',
				description: 'Your Wii U must be homebrewed and able to run unsigned software.',
				note: 'Cemu emulator is not supported.'
			},
			{
				title: 'Pretendo',
				description: 'You must have Pretendo installed and used at least once. This guide assumes Pretendo is already set up on your Wii U.',
				link: { text: 'See how to set it up.', url: 'https://pretendo.network/docs/install/wiiu' }
			}
		],
		dangers: [
			consoleRiskWarning,
			'If the game does not connect or you see a "Server Error", make sure you have linked your Pretendo NNID to your Hub account before launching the game.'
		],
		info: 'Once linked, your Wii U will connect to our servers automatically when you launch a supported game.',
		steps: [
			{
				title: 'Set the Proxy in Network settings',
				details: [
					{ label: 'Host', value: proxyIp },
					{ label: 'Port', value: proxyPort },
					{ label: 'Authentication', value: 'Select no authentication.' }
				]
			},
			{
				title: 'Launch the Game',
				details: [
					{ label: '', value: 'After configuring the proxy and linking your Hub account, simply start the game. Your Wii U will connect to the servers and you can play immediately.' }
				]
			}
		],
		notes: [
			'Ensure your Wii U is connected to the internet.',
			'If you run into issues, check your Pretendo settings or network configuration.',
			'For further assistance, join our Discord.'
		]
	},
	ps4: {
		prerequisites: [...sharedPrerequisites],
		dangers: [ps4RiskWarning],
		info: null,
		steps: [sharedSteps.goToSettings, sharedSteps.setDns, sharedSteps.launchGame],
		notes: [
			'Ensure your PS4 is connected to the internet via Wi-Fi or Ethernet.',
			'If you experience connection issues, try restarting your console.',
			'For further assistance, join our Discord.'
		]
	},
	ps5: {
		prerequisites: [...sharedPrerequisites, {
			title: 'Use the PS4 version',
			description: 'We currently do not support the PS5 version of the games, please use the PS4 version.'
		}],
		dangers: [ps4RiskWarning],
		info: null,
		steps: [sharedSteps.goToSettings, sharedSteps.setDns, sharedSteps.launchGame],
		notes: [
			'Make sure you\'re using the PS4 version of the game. PS5 game support is coming soon!',
			'Ensure your PS5 is connected to the internet via Wi-Fi or Ethernet.',
			'If you experience connection issues, try restarting your console.',
			'For further assistance, join our Discord.'
		]
	},
	nx: {
		prerequisites: [...sharedPrerequisites],
		dangers: [consoleRiskWarning],
		info: 'Once linked, your Nintendo Switch will connect to our servers automatically when you launch a supported game.',
		steps: [sharedSteps.goToSettings, sharedSteps.setDns, sharedSteps.launchGame],
		notes: [
			'Ensure your Nintendo Switch is connected to the internet.',
			'If the game does not connect, verify your DNS settings.',
			'For further assistance, join our Discord.'
		]
	},
	nx2: {
		prerequisites: [...sharedPrerequisites, {
			title: 'Use the Switch version',
			description: 'Make sure you\'re using the Nintendo Switch 1 version of the game.'
		}],
		dangers: [consoleRiskWarning],
		info: 'Once linked, your Nintendo Switch 2 will connect to our servers automatically when you launch a supported game.',
		steps: [sharedSteps.goToSettings, sharedSteps.setDns, sharedSteps.launchGame],
		notes: [
			'Make sure you\'re using the Nintendo Switch 1 version of the game.',
			'Ensure your Nintendo Switch 2 is connected to the internet.',
			'If the game does not connect, verify your DNS settings.',
			'For further assistance, join our Discord.'
		]
	},
	pc: {
		prerequisites: [
			...sharedPrerequisites,
			{
				title: 'Legitimate Just Dance 2017 (Steam / Ubisoft Connect)',
				description: 'This guide is for players who own Just Dance 2017 on Steam or Ubisoft Connect. An unlicensed copy of the game is not supported on this page. If you use a cracked copy, select "PC Crack" from the platform list instead.'
			}
		],
		dangers: [pcRiskWarning],
		info: 'This release is exclusive to players that own Just Dance 2017 for Steam & Ubisoft Connect. You need a legitimate version of the game to proceed.',
		steps: [
			{
				title: 'Download the files',
				details: [
					{ label: '', value: 'Download the corresponding "JD2017.exe" file according to the platform you originally purchased Just Dance 2017 PC from: Steam or Ubisoft Connect. Then download all other files from the Google Drive link below. Do not zip the download — it will corrupt the contents. Download each file individually.' },
					{ label: 'Google Drive', url: 'https://drive.google.com/drive/folders/1Eo3zKlUBrv29OoxjuOpyVnu3cZwaATrK' }
				]
			},
			{
				title: 'Locate your game directory',
				details: [
					{ label: 'Ubisoft Connect', value: 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Just Dance 2017' },
					{ label: 'Steam', value: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Just Dance 2017' }
				]
			},
			{
				title: 'Back up the original game',
				note: 'optional, but recommended',
				details: [
					{ label: '', value: 'Create a new folder called "Just Dance 2017 OG" inside the games directory to hold a copy of the original game files.' }
				]
			},
			{
				title: 'Copy the new files',
				details: [
					{ label: '', value: 'Select all files (including the new "JD2017.exe") and transfer them into the Just Dance 2017 folder, overwriting the originals.' }
				]
			},
			{
				title: 'Launch the Game',
				details: [
					{ label: '', value: 'All done! Launch Just Dance 2017 from Steam or Ubisoft Connect. To revert the process, restore the original files from your "Just Dance 2017 OG" backup.' }
				]
			}
		],
		notes: [
			'Ensure your PC has a stable internet connection.',
			'Download each file individually — zipping will corrupt the contents.',
			'For further assistance, join our Discord.'
		]
	},
	pc_crack: {
		prerequisites: [
			sharedPrerequisites[0],
			{
				title: 'JDMO Hub',
				description: 'You need to obtain the JDMO Hub Desktop app.',
				link: { text: 'Click here to download!', url: '/#hub' }
			},
		],
		dangers: [pcRiskWarning],
		info: null,
		steps: [
			{
				title: 'Obtain the Hub Desktop app.',
				details: [
					{ label: '', value: 'Once you download the app, open it and login with your Hub credentials.' }
				]
			},
			{
				title: 'Launch the Game',
				details: [
					{ label: '', value: "After you log-in, head to the 'Games' page, download the game and launch it." }
				]
			}
		],
		notes: [
			'Ensure your PC has a stable internet connection.',
			'For further assistance, join our Discord.'
		]
	}
};

export const compatGames = [
	{ game: 'Just Dance 2016', pc: null, nx: null, wiiu: 'patreon', ps4: 'patreon', ps5: 'warn' },
	{ game: 'Just Dance 2017', pc: 'yes', nx: 'patreon', wiiu: 'patreon', ps4: 'patreon', ps5: 'warn' },
	{ game: 'Just Dance 2018', pc: null, nx: 'patreon', wiiu: 'patreon', ps4: 'patreon', ps5: 'warn' },
	{ game: 'Just Dance 2019', pc: null, nx: 'yes', wiiu: 'yes', ps4: 'yes', ps5: 'warn' },
	{ game: 'Just Dance 2020', pc: null, nx: 'yes', wiiu: 'yes', ps4: 'yes', ps5: 'warn' },
	{ game: 'Just Dance 2021', pc: null, nx: 'yes', wiiu: 'yes', ps4: 'yes', ps5: 'warn' },
	{ game: 'Just Dance 2022', pc: null, nx: 'yes', wiiu: 'yes', ps4: 'yes', ps5: 'warn' },
];

export const compatFeatures = [
	{ feature: 'World Dance Floor', pc: 'yes', nx: 'yes', wiiu: 'yes', ps4: 'yes' },
	{ feature: 'Leaderboards', pc: 'yes', nx: 'yes', wiiu: 'yes', ps4: 'yes' },
	{ feature: 'Dancer of The Week', pc: null, nx: 'yes', wiiu: 'yes', ps4: 'yes' },
	{ feature: 'World Video Challenge', pc: 'yes', nx: 'yes', wiiu: 'yes', ps4: 'yes' },
	{ feature: 'Autodances', pc: 'yes', nx: null, wiiu: 'yes', ps4: 'yes' },
	{ feature: 'Sweat + Playlists', pc: 'yes', nx: 'yes', wiiu: 'yes', ps4: 'yes' },
	{ feature: 'Dance Quest', pc: 'yes', nx: 'yes', wiiu: 'yes', ps4: 'yes' },
];
