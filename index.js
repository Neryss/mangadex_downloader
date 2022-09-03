require('dotenv').config();
const axios = require('axios').default;
const fs = require('fs');
const path = require('path');

function	auth()
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

function	getChapter()
{
	return new Promise((resolve, reject) => {
		axios.get("https://api.mangadex.org/at-home/server/ef5cfc08-662c-491e-b0ac-0c2f20bca10b").then((res) => {
			resolve(res.data);
		}).catch((err) => {
			reject(err);
		})
	})
}

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

async function	downloadFile(url, name)
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
	console.log(urlParsed);
	return new Promise((resolve, reject) => {
		axios.get(urlParsed).then((res) => {
			resolve(res.data);
		}).catch((err) => {
			reject(err);
		})
	}).catch((err) => {
		console.log(err);
	})
}

async function	main()
{
	auth();
	// temp = await getChapter();
	// console.log(temp);
	// data = await construct_urls(temp);
	// console.log(data[0]);
	// console.log(temp);
	// for (i = 0; i < data.length; i++)
	// 	await downloadFile(data[i], "page" + i + ".png");
	tmp = await getMangaChapters("259dfd8a-f06a-4825-8fa6-a2dcd7274230");
	console.log(tmp);
	return(0);
}

main();