import axios, { AxiosInstance } from "axios"
import ICatalogItem from "../interface/CatalogItem"
import sleep from "../util/sleep"
import ProxyManager from "./ProxyManager"

const searchProxy = new ProxyManager(0, 100)
const detailsProxy = new ProxyManager(100, 200)

export default class CatalogSearch {
	private cursor = ""
	private options: Record<string, string> = {}
	private ended = false
	public page = 0
	public maxPage = 5
	public ratelimitInterval = 30000
	public errorInterval = 1000

	constructor(options: Record<string, string>) {
		this.options = options
	}

	public async exec(): Promise<ICatalogItem[] | null> {
		if(this.ended)
			return null
		
		this.options.Cursor = this.cursor

		let res

		let items
		while(!items) {
			try {
				items = await searchProxy.nextAgent.get("https://catalog.roblox.com/v1/search/items", {
					params: this.options
				})
			} catch(ex) {
				console.error("HOW IS THIS GETTING RATELIMITED????", ex?.response?.status, ex?.response?.data)
			}
		}
		this.cursor = items.data.nextPageCursor

		let csrfToken = await this.getCSRFToken()
		while(!res) {
			try {
				console.log("Getting bulk item details", csrfToken)

				res = await detailsProxy.currentAgent({
					url: "https://catalog.roblox.com/v1/catalog/items/details",
					method: "post",
					headers: {
						"Content-Type": "application/json",
						"x-csrf-token": csrfToken
					},
					data: {
						items: items.data.data
					},
				})
			} catch(ex) {
				if(ex.response.status == 429) {
					console.log("Ratelimit exceeded (HOW?)")
					
					csrfToken = await this.getCSRFToken()
				} else if(ex?.response?.data?.message === "Token Validation Failed") {
					console.log("Getting x-csrf-token:", ex.response.headers["x-csrf-token"])
					csrfToken = ex.response.headers["x-csrf-token"]
				} else {
					console.error("Request error:", ex?.response?.status, ex?.response?.data)
					await sleep(this.errorInterval)
				}
			}
		}
		
		let data = res.data

		this.page++
		if(this.cursor == null || this.page >= this.maxPage)
			this.ended = true
		return data.data
	}

	private async getCSRFToken(): Promise<string> {
		return (await detailsProxy.nextAgent({
			url: "https://auth.roblox.com/v1/usernames/validate",
			method: "post",
			validateStatus: () => true
		})).headers["x-csrf-token"]
	}
}