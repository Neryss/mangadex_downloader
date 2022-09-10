require('dotenv').config();
const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const rl = require('readline');
let infos;

/*
// if you need to use authentification for any reason, you can use the following function
// Just create a `.env` file with the three values M_NAME, M_MAIL, and M_PASS corresponding to your mangadex account
*/

async function	auth()
{
	return new Promise((resolve, reject) => {
		axios.post("https://api.mangadex.org/auth/login", {
			username: process.env.M_NAME,
			email: process.env.M_MAIL,
			password: process.env.M_PASS
		}).then((res) => {
			resolve(res.data)
		}).catch((err) => {
			reject(err);
		})
	})
}

/*
//	return a single chapter data
*/

async function	getChapter(chapterId) {
	return new Promise((resolve, reject) => {
		axios.get("https://api.mangadex.org/at-home/server/" + chapterId).then((res) => {
		resolve(res.data);
	}).catch((err) => {
		reject(err);
	})
})
}

/*
//	construct the urls needed to download the pages later on
*/

async function	construct_urls(data)
{
	url = data.baseUrl + "/data/" + data.chapter.hash + "/";
	return new Promise((resolve, reject) => {
		tmp = data.chapter.data;
		for (i = 0; i < tmp.length; i++)
			tmp[i] = url + tmp[i];
		resolve(tmp);
	}).catch((err) => {
		reject(err);
	})
}

async function	downloadFile(url, dir_name, name)
{
	return new Promise((resolve, reject) => {
		const actual_path = path.resolve(__dirname, dir_name, name);
		if (fs.existsSync(actual_path))
			resolve;
		const writer = fs.createWriteStream(actual_path);
		axios({
			method: "GET",
			url: url,
			responseType: 'stream'
		}).then((res) => {
			res.data.pipe(writer);
			writer.on('finish', resolve);
			writer.on('error', reject);
		}).catch((err) => {
			reject(err);
		})
	})
}

/*
// return a list containing manga volumes and other data
*/

async function	getMangaVolumes(id)
{
	urlParsed = "https://api.mangadex.org/manga/" + id + "/aggregate";
	return new Promise((resolve, reject) => {
		axios.get(urlParsed, {
			params: {translatedLanguage: ["en"]}
		}).then((res) => {
			resolve(res.data);
		}).catch((err) => {
			reject(err);
		})
	}).catch((err) => {
		console.log(err);
	})
}

/*
//	return chapter list from the said volume of a manga
*/

async function	getVolumeChapters(data)
{
	let urls = new Array(Object.keys(data.chapters).length);
	let i = 0;
	for (let key in data.chapters)
	{
		urls[i] = await getChapter(data.chapters[key].id);
		urls[i].chapter_number = data.chapters[key].chapter;
		i++;
	}
	return (urls);
}

/*
//	construct a list containing urls for every page of all chapters in a volume
*/

async function	construct_chapters(chapters)
{
	urlPack = new Array(Object.keys(chapters).length);
	let i = 0;
	for (j = 0; j < Object.keys(chapters).length; j++)
	{
		urlPack[i] = await construct_urls(chapters[j]);
		urlPack[i].id = chapters[j].chapter_number;
		i++;
	}
	return (urlPack);
}

/*
//	download chapters from a volume as the following pattern:
//	each chapter has a file name `chapter${number}`, containing the pages number from 0 to the last page as a name
*/

//	TODO: might add a check for already downloaded volumes, but it seems to be too much work for minimal returns

async function	downloadChapters(urls)
{
	for (i = 0; i < urls.length; i++)
	{
		if (!fs.existsSync("./" + infos.title + "/chapter" + urls[i].id))
			fs.mkdir("./" + infos.title + "/chapter" + urls[i].id,{ recursive: true }, (err) => {
				if (err)
					console.log("error: " + err);
		})
		for (j = 0; j < urls[i].length; j++)
		{
			if (!fs.existsSync("./" + infos.title + "/chapter" + urls[i].id + "/page" + j + ".png"))
			{
				downloadFile(urls[i][j], "./" + infos.title + "/chapter" + urls[i].id, "page" + j + ".png");
				console.log(`chapter ${urls[i].id}, page ${j} done`);
			}
			else
				console.log("page already downloaded!");
		}
	}
}

/*
//	parse argument to get the manga uuid
*/

async function	parseUrl(mangaUrl)
{
	const parsed = {
		parsedUrl: null,
		title: null
	};
	parsed.parsedUrl = mangaUrl.substring(mangaUrl.indexOf('title/') + 6);
	parsed.title = parsed.parsedUrl.split('/').pop();
	parsed.parsedUrl = parsed.parsedUrl.substring(0, parsed.parsedUrl.indexOf('/'));
	return (parsed);
}

function delay(time) {
	return new Promise(resolve => setTimeout(resolve, time));
}

/*
//	download the whole manga, 30s/chapter for now because of api limit rate
*/

async function	downloadManga(manga)
{
	for (k = 1; k < Object.keys(manga.volumes).length; k++)
	{
		chapters = await getVolumeChapters(manga.volumes[k]);
		c_list = await construct_chapters(chapters);
		await downloadChapters(c_list);
		//	TODO: find a better wy to handle 429
		//	I mean, it works but it sucks so...
		// if (k % 2 == 0)
		await delay(30000);
	}
}

//	TODO: handle wip chapters (currently none)

async function	handleStdin()
{
	readLine = rl.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	let temp;
	return new Promise((resolve, reject) => {
		console.log("Enter a valid mangadex url: ");
		readLine.question("enter url: ", (url) => {
			temp = url;
			readLine.close();
			infos = parseUrl(temp);
			resolve(infos);
		})
	})
}

async function	main()
{
	if(!process.argv[2])
		infos = await handleStdin();
	else
		infos = await parseUrl(process.argv[2]);
	if (!fs.existsSync("./" + infos.title))
		fs.mkdir("./" + infos.title,{ recursive: true }, (err) => {
			if (err)
				console.log("error: " + err);
		});
	manga = await getMangaVolumes(infos.parsedUrl);
	await downloadManga(manga);
	return(0);
}

main();