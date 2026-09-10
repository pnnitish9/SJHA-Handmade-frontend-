import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <p className="text-sm uppercase tracking-widest text-thread">Made by hand, one stitch at a time</p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">
            Crochet pieces with the maker's hand still in them
          </h1>
          <p className="mt-5 max-w-md text-clay">
          Every bag, wearable, and homeware piece from handmade_s.jha is made to order —
            browse the shop, save favourites to your wishlist, or request a
            custom design in your own colours.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              to="/shop"
              className="rounded-full bg-thread px-6 py-3 text-cream transition hover:bg-thread/90"
            >
              Browse the shop
            </Link>
            <Link
              to="/register"
              className="rounded-full border border-ink/20 px-6 py-3 text-ink transition hover:border-thread hover:text-thread"
            >
              Create an account
            </Link>
          </div>
        </div>

        <div className="aspect-square overflow-hidden rounded-2xl bg-cream ring-1 ring-clay/20">
          <img
            src="https://res.cloudinary.com/nm8lyjbu/image/upload/v1789061864/handmade.png"
            alt="Handmade product"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="border-t border-clay/20 bg-cream py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-2xl text-ink">Shop by category</h2>
          <p className="mt-2 text-clay">Product and category browsing arrives.</p>
        </div>
      </section>  
    </div>
  );
}
