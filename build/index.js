"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const CatalogSearch_1 = __importDefault(require("./classes/CatalogSearch"));
const CatalogItem_1 = require("./interface/CatalogItem");
const sleep_1 = __importDefault(require("./util/sleep"));
const INTERVAL = 2 * 60 * 1000;
let known = JSON.parse(fs_1.default.readFileSync("known.json").toString());
function IsCollectible(item) {
    return item.itemRestrictions.includes("Collectible");
}
function IsKnown(item) {
    return known.includes(item.id);
}
function AddKnownItem(item) {
    if (IsKnown(item))
        return;
    known.push(item.id);
    fs_1.default.writeFileSync("known.json", JSON.stringify(known));
}
function GetThumbnails(items) {
    return __awaiter(this, void 0, void 0, function* () {
        if (items.length == 0)
            return {};
        let ids = items.map(x => x.id);
        let res = yield axios_1.default.get(`https://thumbnails.roblox.com/v1/assets?assetIds=${ids.join(",")}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`);
        let obj = {};
        for (let thumbnail of res.data.data) {
            obj[thumbnail.targetId] = thumbnail.imageUrl;
        }
        return obj;
    });
}
function WebhookPost(item, thumbnailUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        yield axios_1.default.post(`https://discordapp.com/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`, {
            embeds: [{
                    title: item.name,
                    description: `New ${CatalogItem_1.EnumAssetType[item.assetType]}`,
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
    });
}
function doJob() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting new search");
        let search = new CatalogSearch_1.default({
            Category: "11",
            SortType: "3",
            SortAggregation: "1",
            Limit: "30"
        });
        let items;
        while (items = yield search.exec()) {
            console.log("Search next page:", search.page);
            let list = items.filter(x => IsCollectible(x) && !IsKnown(x));
            if (list.length == 0) {
                yield (0, sleep_1.default)(5000);
                continue;
            }
            let thumbnails = yield GetThumbnails(list);
            for (let item of list) {
                console.log("Processing item", item.name);
                AddKnownItem(item);
                yield WebhookPost(item, thumbnails[item.id]);
                yield (0, sleep_1.default)(2000);
            }
        }
        console.log("Search finished!");
    });
}
doJob();
setInterval(doJob, INTERVAL);
