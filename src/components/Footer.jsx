export default function Footer() {
  return (
    <footer className="border-t border-clay/20 bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-clay">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-display text-xl text-ink">handmade_s.jha</p>
            <p className="mt-2 max-w-xs">
              Crochet and handmade pieces, made to order and shipped with care.
            </p>
          </div>
          <div className="flex gap-12">
            <div>
              <p className="mb-2 font-medium text-ink">Shop</p>
              <ul className="space-y-1">
                <li>New arrivals</li>
                <li>Best sellers</li>
                <li>Custom orders</li>
              </ul>
            </div>
            <div>
              <p className="mb-2 font-medium text-ink">Support</p>
              <ul className="space-y-1">
                <li>Track an order</li>
                <li>Chat with us</li>
                <li>Returns</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-clay/20 pt-6 text-xs">
          © {new Date().getFullYear()} handmade_s.jha. All pieces made by hand.
        </p>
      </div>
    </footer>
  );
}
