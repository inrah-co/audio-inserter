export function getFormattedTimestamp(): string {
	const now = new Date();
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
		now.getDate()
	)}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(
		now.getSeconds()
	)}`;
}
