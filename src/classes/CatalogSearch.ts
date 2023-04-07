import axios, { AxiosInstance } from "axios"
import ICatalogItem from "../interface/CatalogItem"
import sleep from "../util/sleep"

export default class CatalogSearch {
	private cursor = ""
	private options: Record<string, string> = {}
	private ended = false
	public page = 0
	public maxPage = 10
	public ratelimitInterval = 1000
	public errorInterval = 1000

	private axiosInstance: AxiosInstance = axios

	constructor(options: Record<string, string>) {
		this.options = options
	}

	public useAxios(axiosInstance: AxiosInstance) {
		this.axiosInstance = axiosInstance
	}

	public async exec(): Promise<ICatalogItem[] | null> {
		if(this.ended)
			return null
		
		this.options.Cursor = this.cursor

		let res
		while(!res) {
			try {
				res = await this.axiosInstance.get("https://catalog.roblox.com/v1/search/items/details", {
					params: this.options
				})
			} catch(ex) {
				if(ex.response.status == 429) {
					console.log("Ratelimit exceeded, sleeping...")
					await sleep(this.ratelimitInterval)
				} else {
					console.error("Request error:", ex?.response?.status, ex?.respose?.data)
					await sleep(this.errorInterval)
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