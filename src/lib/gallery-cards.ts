import { STOCK } from "@/lib/stock-images";
import type { CardItem } from "@/components/ui/card-fan-carousel";

export const EVENT_GALLERY: CardItem[] = [
  { imgUrl: STOCK.weddingArch, alt: "Outdoor wedding ceremony", linkUrl: "/planner?type=wedding" },
  { imgUrl: STOCK.birthdayCake, alt: "Birthday cake celebration", linkUrl: "/planner?type=birthday" },
  { imgUrl: STOCK.communityGathering, alt: "Community gathering", linkUrl: "/planner?type=community" },
  { imgUrl: STOCK.weddingTable, alt: "Reception tablescape", linkUrl: "/planner?type=wedding" },
  { imgUrl: STOCK.birthdayBalloons, alt: "Balloon birthday party", linkUrl: "/planner?type=birthday" },
  { imgUrl: STOCK.communityMarket, alt: "Neighborhood night market", linkUrl: "/planner?type=community" },
  { imgUrl: STOCK.weddingDance, alt: "Wedding dance floor", linkUrl: "/planner?type=wedding" },
  { imgUrl: STOCK.birthdayPicnic, alt: "Picnic birthday", linkUrl: "/planner?type=birthday" },
  { imgUrl: STOCK.flowers, alt: "Seasonal floral details", linkUrl: "/planner" },
  { imgUrl: STOCK.lights, alt: "Evening event lighting", linkUrl: "/planner" },
];
