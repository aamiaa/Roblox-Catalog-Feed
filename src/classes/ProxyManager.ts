import axios, { AxiosInstance } from "axios"
import HttpsProxyAgent from "https-proxy-agent"

export default class ProxyManager {
	private available: number[] = []
	private currentIdx = 0
	private agent: AxiosInstance

	constructor(min: number, max: number) {
		for(let i=min;i<max;i++) {
			this.available.push(i)
		}
	}

	private increment() {
		this.currentIdx = (this.currentIdx + 1) % this.available.length
	}

	public get nextAgent(): AxiosInstance {
		const httpsAgent = HttpsProxyAgent({
			host: process.env.ProxyHost,
			port: process.env.ProxyPort,
			auth: `${process.env.ProxyBackboneUsername}-${this.available[this.currentIdx]}:${process.env.ProxyPassword}`,
		})
		const axiosInstance = axios.create({
			httpsAgent
		})
		this.agent = axiosInstance

		this.increment()
		return axiosInstance
	}

	public get currentAgent() {
		return this.agent
	}
}