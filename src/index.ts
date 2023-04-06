import "dotenv/config"
import axios from "axios"
import fs from "fs"
import CatalogSearch from "./classes/CatalogSearch"
import ICatalogItem, { EnumAssetType } from "./interface/CatalogItem"
import sleep from "./util/sleep"

const INTERVAL = 2 * 60 * 1000

let known = JSON.parse(fs.readFileSync("known.json").toString())

function IsUGCCollectible(item: ICatalogItem) {
	return item.itemRestrictions.includes("Collectible") && item.creatorTargetId != 1 // Exclude ROBLOX account
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
	let res = await axios.get(`https://thumbnails.roblox.com/v1/assets?assetIds=${ids.join(",")}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`)
	
	let obj: Record<string, string> = {}
	for(let thumbnail of res.data.data) {
		obj[thumbnail.targetId] = thumbnail.imageUrl
	}

	return obj
}

async function WebhookPost(item: ICatalogItem, thumbnailUrl: string) {
	await axios.post(`https://discordapp.com/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`, {
		embeds: [{
			title: item.name,
			description: `New ${EnumAssetType[item.assetType]}`,
			url: `https://roblox.com/catalog/${item.id}`,
			color: 5814783,
			fields: [
				{
					name: "Price",
					value: item.price || "Free?",
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

async function doJob() {
	console.log("Starting new search")

	let search = new CatalogSearch({
		Category: "11",
		SortType: "3",
		SortAggregation: "1",
		Limit: "30"
	})

	let items: ICatalogItem[] | null

	while(items = await search.exec()) {
		console.log("Search next page:", search.page)

		let list = items.filter(x => IsUGCCollectible(x) && !IsKnown(x))
		if(list.length == 0) {
			await sleep(5000)
			continue
		}

		let thumbnails = await GetThumbnails(list)

		for(let item of list) {
			console.log("Processing item", item.name)

			AddKnownItem(item)
			await WebhookPost(item, thumbnails[item.id])
			await sleep(2000)
		}
	}

	console.log("Search finished!")
}

doJob()
setInterval(doJob, INTERVAL)