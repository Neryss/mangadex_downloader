require('dotenv').config();
const axios = require('axios').default;
const fs = require('fs');
const path = require('path');

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

async function	construct_urls(data)
{
	console.log(data);
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
		const actual_path = path.resolve(__dirname, "images", name);
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

async function	getMangaChapters(id)
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

async function	getVolumeChapters(data)
{
	let urls = new Array(Object.keys(data.chapters).length);
	let i = 0;
	// console.log(data);
	for (let key in data.chapters)
	{
		urls[i] = await getChapter(data.chapters[key].id);
		i++;
	}
	return (urls);
}

async function	construct_chapters(chapters)
{
	urlPack = new Array(Object.keys(chapters).length);
	// console.log(chapters[1]);
	let i = 0;
	for (j = 0; j < Object.keys(chapters).length; j++)
	{
		urlPack[i] = await construct_urls(chapters[j]);
		urlPack[i].id = i;
		i++;
	}
	return (urlPack);
}

async function	downloadChapters(urls, tmp)
{
	console.log("JE SUIS LA EN FAIT");
	// console.log(tmp);
	for (i = 0; i < urls.length; i++)
	{
		for (j = 0; j < urls[i].length; j++)
			downloadFile(urls[i][j], "chapter1", "chapter" + j + "page" + i + ".png");
	}
}

// TODO transfer chapters into urls
// TODO create flexible download solution (directories, name etc...)

async function	main()
{
	// auth();
	tmp = await getMangaChapters("259dfd8a-f06a-4825-8fa6-a2dcd7274230");
	// console.log(tmp.volumes);
	lst = await getVolumeChapters(tmp.volumes[1]);
	// console.log(tmp.volumes);
	// console.log(lst);
	other = await construct_chapters(lst, tmp);
	console.log(other);
	// downloadChapters(other);
	// let urls = new Array(Object.keys(tmp.volumes[1].chapters));
	// let i = 0;
	// for (let key in tmp.volumes[1].chapters)
	// {
	// 	urls[i] = await getChapter(tmp.volumes[1].chapters[key].id);
	// 	i++;
	// }
	// console.log(urls);
	return(0);
}

main();