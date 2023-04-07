import axios from "axios"
import ICatalogItem from "../interface/CatalogItem"
import sleep from "../util/sleep"

export default class CatalogSearch {
	private cursor = ""
	private options: Record<string, string> = {}
	private ended = false
	public page = 0
	public maxPage = 1

	constructor(options: Record<string, string>) {
		this.options = options
	}

	public async exec(): Promise<ICatalogItem[] | null> {
		if(this.ended)
			return null
		
		this.options.Cursor = this.cursor

		let res
		while(!res) {
			try {
				res = await axios.get("https://catalog.roblox.com/v1/search/items/details", {
					params: this.options
				})
			} catch(ex) {
				if(ex.response.status == 429) {
					console.log("Ratelimit exceeded, sleeping...")
					await sleep(30000)
				} else {
					console.error("Request error:", ex?.response?.status, ex?.respose?.data)
				}
			}
		}
		
		let data = res.data

		this.cursor = data.nextPageCursor
		this.page++
		if(data.nextPageCursor == null || this.page >= this.maxPage)
			this.ended = true
		return data.data
	}
}