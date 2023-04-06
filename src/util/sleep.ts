export default function sleep(ms: number) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, ms)
	})
}