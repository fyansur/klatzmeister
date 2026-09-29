import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { motion, useSpring } from "motion/react"

// satu tooltip buat semua elemen yang punya data-tip (+ data-tip-sub opsional).
// pasang sekali di App. gerak antar elemen di-spring biar ngeluncur, bukan loncat.
const SPRING = { stiffness: 600, damping: 40, mass: 0.4 }
const GAP = 8

type Tip = { text: string; sub: string | null; rect: DOMRect; visible: boolean }

export default function HoverTip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const shown = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const x = useSpring(0, SPRING)
  const y = useSpring(0, SPRING)

  useEffect(() => {
    const hide = () => {
      shown.current = false
      setTip((t) => t && { ...t, visible: false })
    }
    const onOver = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip]")
      clearTimeout(hideTimer.current)
      // delay dikit biar lewat celah antar kotak heatmap nggak kedip
      if (!el) return void (hideTimer.current = setTimeout(hide, 80))
      setTip({ text: el.getAttribute("data-tip")!, sub: el.getAttribute("data-tip-sub"), rect: el.getBoundingClientRect(), visible: true })
    }
    const onOut = () => {
      clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(hide, 80)
    }

    document.addEventListener("mouseover", onOver)
    document.addEventListener("focusin", onOver)
    document.addEventListener("focusout", onOut)
    document.documentElement.addEventListener("mouseleave", onOut)
    window.addEventListener("scroll", hide, true)
    return () => {
      clearTimeout(hideTimer.current)
      document.removeEventListener("mouseover", onOver)
      document.removeEventListener("focusin", onOver)
      document.removeEventListener("focusout", onOut)
      document.documentElement.removeEventListener("mouseleave", onOut)
      window.removeEventListener("scroll", hide, true)
    }
  }, [])

  // posisi dihitung setelah teks ke-render, biar lebar tooltip bisa dipake buat clamp ke layar
  useLayoutEffect(() => {
    if (!tip?.visible || !ref.current) return
    const half = ref.current.offsetWidth / 2
    const cx = Math.min(Math.max(tip.rect.left + tip.rect.width / 2, GAP + half), innerWidth - GAP - half)
    const top = tip.rect.top - GAP
    if (shown.current) {
      x.set(cx)
      y.set(top)
    } else {
      x.jump(cx)
      y.jump(top)
      shown.current = true
    }
  }, [tip, x, y])

  return (
    <motion.div style={{ x, y }} className="pointer-events-none fixed left-0 top-0 z-50">
      <motion.div
        ref={ref}
        role="tooltip"
        initial={false}
        animate={tip?.visible ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.92, y: 4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="-translate-x-1/2 -translate-y-full origin-bottom whitespace-nowrap rounded-lg border border-white/10 bg-neutral-900/85 px-2.5 py-1.5 text-center shadow-xl shadow-black/40 backdrop-blur-md"
      >
        <p className="text-xs font-medium text-neutral-100">{tip?.text}</p>
        {tip?.sub && <p className="text-[10px] text-neutral-400">{tip.sub}</p>}
      </motion.div>
    </motion.div>
  )
}
