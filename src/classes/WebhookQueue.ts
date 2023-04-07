import axios from "axios"
import sleep from "../util/sleep"

export default class WebhookQueue {
	private _queue = []
	private id: string
	private token: string
	
	public delay = 2000

	constructor(webhookId: string, webhookToken: string) {
		this.id = webhookId
		this.token = webhookToken

		setTimeout(this.processQueue.bind(this), 1000)
	}

	public push(data: any) {
		this._queue.push(data)
	}

	private async processQueue() {
		let item: any

		while(item = this._queue.shift()) {
			try {
				await axios.post(`https://discordapp.com/api/webhooks/${this.id}/${this.token}`, item)
			} catch(ex) {
				console.error("Webhook error:", ex?.response?.status, ex?.respose?.data)
			}
			
			await sleep(this.delay)
		}

		setTimeout(this.processQueue.bind(this), 1000)
	}
}