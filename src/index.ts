import "dotenv/config"
import axios from "axios"
import fs from "fs"
import CatalogSearch from "./classes/CatalogSearch"
import ICatalogItem, { EnumAssetType } from "./interface/CatalogItem"
import HttpsProxyAgent from "https-proxy-agent"
import WebhookQueue from "./classes/WebhookQueue"

const INTERVAL = 5 * 1000
const FreeLimitedRole = process.env.FreeLimitedRole
const SmallQuantityLimitedRole = process.env.SmallQuantityLimitedRole

let known = JSON.parse(fs.readFileSync("known.json").toString())

const httpsAgent = HttpsProxyAgent({
	host: process.env.ProxyHost,
	port: process.env.ProxyPort,
	auth: `${process.env.ProxyUsername}:${process.env.ProxyPassword}`,
})
const axiosInstance = axios.create({
	httpsAgent
})

function IsUGCCollectible(item: ICatalogItem) {
	return item.itemRestrictions?.includes("Collectible") && item.creatorTargetId != 1 // Exclude ROBLOX account
}

function IsKnown(item: ICatalogItem) {
	return known.includes(item.id)
}

function AddKnownItem(item: ICatalogItem) {
	if(IsKnown(item))
		return

	known.push(item.id)
	fs.writeFileSync("known.json", JSON.stringify(known))
}

async function GetThumbnails(items: ICatalogItem[]) {
	if(items.length == 0)
		return {}
		
	let ids = items.map(x => x.id)
	let res = await axiosInstance.get(`https://thumbnails.roblox.com/v1/assets?assetIds=${ids.join(",")}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`)
	
	let obj: Record<string, string> = {}
	for(let thumbnail of res.data.data) {
		obj[thumbnail.targetId] = thumbnail.imageUrl
	}

	return obj
}

const whQueue = new WebhookQueue(process.env.WEBHOOK_ID, process.env.WEBHOOK_TOKEN)
function WebhookPost(item: ICatalogItem, thumbnailUrl: string) {
	let isFree = item.price === 0
	let isSmallQuantity = item.totalQuantity <= 300

	let mentions = []
	if(isFree && item.unitsAvailableForConsumption > 0)
		mentions.push(`<@&${FreeLimitedRole}>`)
	if(isSmallQuantity)
		mentions.push(`<@&${SmallQuantityLimitedRole}>`)

	whQueue.push({
		content: mentions.join(" "),
		embeds: [{
			title: item.name,
			description: item.description.substring(0, 2000),
			url: `https://roblox.com/catalog/${item.id}`,
			color: isSmallQuantity ? 0xff2942 : 5814783,
			fields: [
				{
					name: "Price",
					value: item.price || "Free?",
					inline: true
				},
				{
					name: "Type",
					value: EnumAssetType[item.assetType] || "Unknown",
					inline: true
				},
				{
					name: "Remaining",
					value: `${item.unitsAvailableForConsumption}/${item.totalQuantity}`
				}
			],
			author: {
				name: item.creatorName,
				url: item.creatorType == "User" ? `https://roblox.com/users/${item.creatorTargetId}/profile` : `https://roblox.com/groups/${item.creatorTargetId}`
			},
			thumbnail: {
				url: thumbnailUrl
			}
		}]
	});
}

let turns = [
	{
		salesTypeFilter: "1"
	},
	{
		salesTypeFilter: "2"
	},
	{
		salesTypeFilter: "1",
		Keyword: "white cap wings facemask card shiny tail skull king queen troll ruby money old rose unicorn huge red head man big cute rusher coin silver time money rich gold pink black red limited blue yellow green purple test hat silver horns headphones mask crown fedora coin fedora pink red orange yellow green blue purple black brown white gray test hat rainboworange teal cyan red green topaz yellow wings maroon space dominus lime mask mossy wooden crimson salmon brown pastel  ruby diamond creatorname follow catalog link rare emerald chain blue deep expensive furry hood currency coin royal navy ocean air white cyber ugc verified black purple yellow violet description dark bright rainbow pink cyber roblox multicolor light gradient grey tags animation thigh highs socks femby tomboy girly boy reddishwhite cap wings facemask card shiny tail skull king queen troll ruby money old rose unicorn huge red head man big cute rusher coin silver time money rich gold pink black yellow green blue purple black brown white gray test hat rainboworange teal cyan red green topaz yellow wings maroon space dominus lime mask mossy wooden crimson salmon brown pastel  ruby diamond creatorname follow catalog link rare emerald anyone hand facemask bear catboy princess prince king ariana grande tags animation thigh highs socks femby tomboy girly boy reddish pokemon yugioh initial "
	},
	{
		salesTypeFilter: "2",
		Keyword: "white cap wings facemask card shiny tail skull king queen troll ruby money old rose unicorn huge red head man big cute rusher coin silver time money rich gold pink black red limited blue yellow green purple test hat silver horns headphones mask crown fedora coin fedora pink red orange yellow green blue purple black brown white gray test hat rainboworange teal cyan red green topaz yellow wings maroon space dominus lime mask mossy wooden crimson salmon brown pastel  ruby diamond creatorname follow catalog link rare emerald chain blue deep expensive furry hood currency coin royal navy ocean air white cyber ugc verified black purple yellow violet description dark bright rainbow pink cyber roblox multicolor light gradient grey tags animation thigh highs socks femby tomboy girly boy reddishwhite cap wings facemask card shiny tail skull king queen troll ruby money old rose unicorn huge red head man big cute rusher coin silver time money rich gold pink black yellow green blue purple black brown white gray test hat rainboworange teal cyan red green topaz yellow wings maroon space dominus lime mask mossy wooden crimson salmon brown pastel  ruby diamond creatorname follow catalog link rare emerald anyone hand facemask bear catboy princess prince king ariana grande tags animation thigh highs socks femby tomboy girly boy reddish pokemon yugioh initial "
	}
]
let currentTurn = -1
async function doJob() {
	currentTurn = (currentTurn + 1) % turns.length
	console.log("Starting new search, turn:", currentTurn)

	let searchData = {
		Category: "11",
		SortType: "3",
		SortAggregation: "1",
		Limit: "30"
	}
	for(let key in turns[currentTurn])
		searchData[key] = turns[currentTurn][key]

	let search = new CatalogSearch(searchData)
	search.useAxios(axiosInstance)

	try {
		let items: ICatalogItem[] | null

		while(items = await search.exec()) {
			console.log("Search next page:", search.page)

			let list = items.filter(x => IsUGCCollectible(x) && !IsKnown(x))
			if(list.length == 0) 
				continue

			let thumbnails = await GetThumbnails(list)

			for(let item of list) {
				console.log("Processing item", item.name)

				AddKnownItem(item)
				WebhookPost(item, thumbnails[item.id])
			}
		}

		console.log("Search finished!")
	} catch(ex) {
		console.error("Search failed:", ex)
	}

	setTimeout(doJob, INTERVAL)
}

doJob()