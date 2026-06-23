import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const CASES = [
  {
    id: 'workflow', code: '01', client: 'Global Financial Services Firm',
    title: 'Enterprise AI Workflow Automation', year: '2024', col: 186,
    problem: 'A 12,000-person financial services firm was processing 400,000+ compliance documents per month manually. Review cycles took 14 days. Error rates caused regulatory exposure costing millions annually.',
    solution: 'We built an end-to-end intelligent document processing system: a fine-tuned LLM for financial document classification, a multi-agent review pipeline, and an exception-routing engine that escalated only genuinely ambiguous cases to human reviewers.',
    tech: 'Custom LLM fine-tuning on proprietary document corpus, vector semantic search, multi-agent orchestration, human-in-the-loop approval workflows, real-time compliance logging.',
    impact: [
      { val: '91%', label: 'reduction in review time' },
      { val: '14→1.2 days', label: 'cycle time per document' },
      { val: '$8.4M', label: 'annual operational savings' },
      { val: '99.7%', label: 'classification accuracy' },
    ],
  },
  {
    id: 'logistics', code: '02', client: 'European Logistics Network',
    title: 'Logistics Optimization Platform', year: '2024', col: 42,
    problem: 'A pan-European logistics operator with 8,000 daily shipments was experiencing 23% late deliveries and fuel waste from unoptimized routing — directly impacting client contracts and carbon targets.',
    solution: 'A real-time logistics intelligence platform combining live traffic data, weather modeling, driver availability, and dynamic load optimization. The system re-routes in-flight shipments within 200ms of a disruption event.',
    tech: 'Graph neural networks for route optimization, real-time event streaming via Apache Kafka, constraint satisfaction solvers, digital twin simulation, multi-fleet coordination API.',
    impact: [
      { val: '31%', label: 'reduction in late deliveries' },
      { val: '18%', label: 'fuel cost decrease' },
      { val: '200ms', label: 'real-time rerouting latency' },
      { val: '€14.2M', label: 'recovered contract value' },
    ],
  },
  {
    id: 'docint', code: '03', client: 'Healthcare Enterprise Group',
    title: 'Document Intelligence System', year: '2023', col: 186,
    problem: 'A hospital group across 42 facilities was managing 11 million annual patient records across incompatible systems. Clinical staff spent 35% of their time on documentation instead of care.',
    solution: 'A unified document intelligence layer: automated intake, cross-system record normalization, clinical NLP for structured data extraction, and a zero-latency query interface for clinicians to retrieve any record in natural language.',
    tech: 'Medical-domain NLP models, federated data architecture across legacy EHR systems, HIPAA-compliant encryption pipeline, React-based clinical query interface, edge-deployed inference for offline wards.',
    impact: [
      { val: '35% → 8%', label: 'time spent on documentation' },
      { val: '11M+', label: 'records unified and queryable' },
      { val: '<800ms', label: 'record retrieval time' },
      { val: '42', label: 'facilities integrated' },
    ],
  },
  {
    id: 'robotics', code: '04', client: 'Industrial Manufacturing Group',
    title: 'Robotics Control Dashboard', year: '2023', col: 42,
    problem: 'A tier-1 auto parts manufacturer operating 340 robotic cells had zero real-time visibility into production health. Failures were discovered after defect propagation — average downtime cost was $220K per incident.',
    solution: 'A centralized robotics operations platform providing millisecond telemetry, predictive failure modeling per robot cell, automated shutdown sequences, and a digital twin for simulation-based pre-deployment testing of new motion programs.',
    tech: 'Real-time MQTT telemetry ingestion, time-series anomaly detection, digital twin in three.js, REST + WebSocket control API, PLC integration layer, mobile-responsive operator interface.',
    impact: [
      { val: '78%', label: 'reduction in unplanned downtime' },
      { val: '340', label: 'robotic cells under live control' },
      { val: '$4.1M', label: 'annual downtime cost avoided' },
      { val: '12ms', label: 'telemetry-to-alert latency' },
    ],
  },
  {
    id: 'support-ai', code: '05', client: 'SaaS Platform — 2M+ Users',
    title: 'Customer Support AI System', year: '2024', col: 186,
    problem: 'A fast-scaling SaaS company with 2 million users had a support team drowning in 40,000 monthly tickets. Response times averaged 18 hours. Customer satisfaction scores were declining.',
    solution: 'An AI support system that resolves Tier-1 tickets autonomously, drafts Tier-2 responses for human approval, detects churn risk from ticket sentiment, and surfaces product insight patterns to the engineering team weekly.',
    tech: 'Retrieval-augmented generation over product documentation, ticket classification & routing, sentiment-based churn modeling, agent-human handoff protocol, Slack-integrated engineer digest.',
    impact: [
      { val: '68%', label: 'tickets resolved autonomously' },
      { val: '18h → 4min', label: 'average response time' },
      { val: '+23pts', label: 'NPS improvement in 90 days' },
      { val: '3.4×', label: 'support team capacity increase' },
    ],
  },
];

function ImpactMetric({ m, col, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + i * 0.08, duration: 0.7, ease: [0.16,1,0.3,1] }}
      className="pr-6 py-2"
    >
      <div className="font-grotesk font-bold leading-none mb-2"
        style={{
          fontSize: 'clamp(24px, 3.5vw, 44px)',
          color: `hsla(${col},100%,50%,0.9)`,
          textShadow: `0 0 50px hsla(${col},100%,50%,0.3)`,
        }}>
        {m.val}
      </div>
      <div className="font-mono text-[7px] tracking-[0.1em] uppercase text-foreground/20">{m.label}</div>
    </motion.div>
  );
}

export default function ProjectsSection() {
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const proj = CASES[active];

  return (
    <section ref={ref} id="projects" className="relative overflow-hidden" style={{ background: '#050507', minHeight: '100vh' }}>
      {/* Background visual identity shift */}
      <AnimatePresence>
        <motion.div
          key={proj.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 40% at 70% 50%, hsla(${proj.col},100%,50%,0.02) 0%, transparent 70%)`,
          }}
        />
      </AnimatePresence>

      <div className="relative z-10 px-[max(32px,6vw)] pt-[12vh] pb-[10vh]">
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 1 }} className="flex items-center gap-4 mb-14">
          <div className="w-6 h-[1px] bg-primary/35" />
          <span className="font-mono text-[9px] tracking-[0.5em] uppercase text-primary/35">Selected Work</span>
        </motion.div>

        <div className="overflow-hidden mb-16">
          <motion.h2 initial={{ y: '110%' }} animate={isInView ? { y: 0 } : {}} transition={{ duration: 1.4, ease: [0.16,1,0.3,1] }}
            className="font-grotesk text-[clamp(34px,6vw,96px)] font-bold tracking-[-0.04em] leading-none text-foreground">
            Proof of Execution.
          </motion.h2>
        </div>

        <div className="flex flex-col xl:flex-row gap-10 xl:gap-0">
          <div className="xl:w-[36%] xl:pr-12">
            {CASES.map((c, i) => (
              <motion.button key={c.id}
                initial={{ opacity: 0, x: -24 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.25 + i * 0.09, duration: 0.85 }}
                onClick={() => setActive(i)}
                className="group w-full text-left py-5 flex items-start gap-4 relative overflow-hidden"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <motion.div
                  className="flex-shrink-0 mt-1 w-[2px] h-7 rounded-full"
                  animate={{
                    background: active === i ? `hsl(${c.col},100%,50%)` : 'rgba(255,255,255,0.06)',
                    boxShadow: active === i ? `0 0 12px hsl(${c.col},100%,50%)` : 'none',
                  }}
                  transition={{ duration: 0.5 }}
                />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-grotesk text-sm md:text-base font-semibold tracking-tight transition-colors duration-500 leading-tight"
                      style={{ color: active === i ? 'white' : 'rgba(255,255,255,0.18)' }}>
                      {c.title}
                    </h3>
                    <span className="font-mono text-[6px] tracking-[0.2em] flex-shrink-0 ml-3"
                      style={{ color: active === i ? `hsla(${c.col},100%,50%,0.5)` : 'rgba(255,255,255,0.06)' }}>
                      {c.year}
                    </span>
                  </div>
                  <p className="font-mono text-[7px] tracking-[0.1em] uppercase transition-colors duration-500"
                    style={{ color: active === i ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)' }}>
                    {c.client}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="xl:w-[64%] relative">
            <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-[1px] bg-foreground/[0.04]" />
            <AnimatePresence mode="wait">
              <motion.div key={proj.id}
                initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }}
                className="xl:pl-14"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mb-12">
                  {proj.impact.map((m, i) => (
                    <ImpactMetric key={i} m={m} col={proj.col} i={i} />
                  ))}
                </div>

                <div className="h-[1px] mb-10 bg-foreground/[0.04]" />

                <div className="space-y-8 max-w-2xl">
                  {[
                    { label: 'Problem', content: proj.problem },
                    { label: 'Solution', content: proj.solution },
                    { label: 'Technical Approach', content: proj.tech },
                  ].map((block) => (
                    <div key={block.label}>
                      <div className="font-mono text-[7px] tracking-[0.35em] uppercase mb-3"
                        style={{ color: `hsla(${proj.col},100%,50%,0.4)` }}>
                        {block.label}
                      </div>
                      <p className="font-inter font-light text-[13px] md:text-sm text-foreground/28 leading-[1.95]">{block.content}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-10 font-mono text-[7px] tracking-[0.2em] uppercase text-foreground/8">{proj.client}</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}