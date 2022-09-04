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
		console.log(err);
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
	let urls = new Array(Object.keys(data.chapters).length);
	let i = 0;
	for (let key in data.chapters)
	{
		urls[i] = await getChapter(data.chapters[key].id);
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
		urlPack[i].id = i + 1;
		i++;
	}
	return (urlPack);
}

/*
//	download chapters from a volume as the following pattern:
//	each chapter has a file name `chapter${number}`, containing the pages number from 0 to the last page as a name
*/
// TODO mulitple volumes at the same time
// TODO chapters not reseting each volume

async function	downloadChapters(urls)
{
	for (i = 0; i < urls.length; i++)
	{
		console.log(urls[i].id);
		if (!fs.existsSync("./chapter" + urls[i].id))
			fs.mkdir("./chapter" + urls[i].id,{ recursive: true }, (err) => {
				console.log("error: " + err);
		})
		for (j = 0; j < urls[i].length; j++)
		{
			downloadFile(urls[i][j], "chapter" + (i + 1), "page" + j + ".png");
			console.log(`chapter ${i + 1}, page ${j} done`);
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

// TODO create flexible download solution (directories, name etc...)
// TODO chapter url as argument?
async function	main()
{
	// auth();
	if(!process.argv[2])
	{
		console.error("error: enter url as argument");
		return (1);
	}
	url = process.argv[2];
	console.log(url);
	url = await parseUrl(url);
	console.log(url);
	// tmp = await getMangaVolumes("259dfd8a-f06a-4825-8fa6-a2dcd7274230");
	// lst = await getVolumeChapters(tmp.volumes[1]);
	// other = await construct_chapters(lst);
	// console.log(other);
	// downloadChapters(other);
	return(0);
}

main();