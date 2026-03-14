import { FoodscanApp } from "@/components/foodscan-app";
import Script from "next/script";

export default function Home() {
  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js"
        strategy="lazyOnload"
      />
      <FoodscanApp />
    </>
  );
}
