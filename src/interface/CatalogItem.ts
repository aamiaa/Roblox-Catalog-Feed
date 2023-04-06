export enum EnumAssetType {
	TShirt = 2,
	Hat = 8,
	Shirt = 11,
	Pants = 12,
	Head = 17,
	Face = 18,
	Gear = 19,
	Arms = 25,
	Legs = 26,
	Torso = 27,
	RightArm = 28,
	LeftArm = 29,
	LeftLeg = 30,
	RightLeg = 31,
	HairAccessory = 41,
	FaceAccessory = 42,
	NeckAccessory = 43,
	ShoulderAccessory = 44,
	FrontAccessory = 45,
	BackAccessory = 46,
	WaistAccessory = 47,
	ClimbAnimation = 48,
	DeathAnimation = 49,
	FallAnimation = 50,
	IdleAnimation = 51,
	JumpAnimation = 52,
	RunAnimation = 53,
	SwimAnimation = 54,
	WalkAnimation = 55,
	PoseAnimation = 56,
	EmoteAnimation = 61
}

export default interface ICatalogItem {
	id: number,
	itemType: "Asset" | "Bundle",
	assetType: EnumAssetType,
	name: string,
	description: string,
	itemRestrictions: ("ThirteenPlus" | "LimitedUnique" | "Limited" | "Rthro" | "Collectible")[],
	creatorType: "User" | "Group",
	creatorTargetId: number,
	creatorName: string,
	price: number,
	priceStatus?: "Free" | "Offsale" | "NoResellers"
	lowestPrice?: number,
	unitsAvailableForConsumption?: number,
	collectibleItemId?: string,
	totalQuantity?: number
}