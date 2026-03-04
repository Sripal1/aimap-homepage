import Hero from '@/components/sections/Hero'
import DemoShowcase from '@/components/sections/DemoShowcase'
import Pipeline from '@/components/sections/Pipeline'
import Features from '@/components/sections/Features'
import Deployments from '@/components/sections/Deployments'

export default function HomePage() {
  return (
    <>
      <Hero />
      <DemoShowcase />
      <Pipeline />
      <Features />
      <Deployments />
    </>
  )
}
