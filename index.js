require('dotenv').config();
const axios = require('axios').default;
const fs = require('fs');
const path = require('path');

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

function	getChapter(chapterId)
{
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

// TODO create dir directly here to handle multiple chapters
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
	// console.log(data);
	let urls = new Array(Object.keys(data.chapters).length);
	let i = 0;
	for (let key in data.chapters)
	{
		urls[i] = await getChapter(data.chapters[key].id);
		// await delay(300);
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

// TODO mulitple volumes at the same time

async function	downloadChapters(urls)
{
	for (i = 0; i < urls.length; i++)
	{
		if (!fs.existsSync("./chapter" + urls[i].id))
			fs.mkdir("./chapter" + urls[i].id,{ recursive: true }, (err) => {
				console.log("error: " + err);
		})
		for (j = 0; j < urls[i].length; j++)
		{
			downloadFile(urls[i][j], "chapter" + urls[i].id, "page" + j + ".png");
			console.log(`chapter ${urls[i].id}, page ${j} done`);
		}
	}
}

/*
//	parse argument to get the manga uuid
*/

async function	parseUrl(mangaUrl)
{
	parsedUrl = mangaUrl.substring(mangaUrl.indexOf('title/') + 6);
	parsedUrl = parsedUrl.substring(0, parsedUrl.indexOf('/'));
	return (parsedUrl);
}

function delay(time) {
	return new Promise(resolve => setTimeout(resolve, time));
}

//	TODO create flexible download solution (directories, name etc...)
//	TODO fix rate limit
async function	main()
{
	if(!process.argv[2])
	{
		console.error("error: enter url as argument");
		return (1);
	}
	url = await parseUrl(process.argv[2]);
	manga = await getMangaVolumes(url);
	// console.log(manga);
	// let chapters_list;
	// for (i = 1; i < Object.keys(manga.volumes).length; i++)
	// {
	// 	chapters_list += await getVolumeChapters(manga.volumes[i]);
	// }
	// console.log(chapters_list);
	for (i = 1; i < 3; i++)
	{
		chapters = await getVolumeChapters(manga.volumes[i]);
		console.log("####### CHAPTERS HERE #######")
		console.log(chapters);
		c_list = await construct_chapters(chapters);
		// await downloadChapters(c_list);
	}
	return(0);
}

main();