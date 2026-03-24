import { useState } from 'react';
import { BackButton, Button, Card, Input, TextArea, Badge, SectionLabel, MenuRow, ChoreRow, UncheckedCircle, ProgressBar, ProgressRing } from './ui';

const COLORS = [
  { name: 'Brand',       hex: '#4A90E2', tw: 'bg-brand' },
  { name: 'Brand Light', hex: '#EBF3FC', tw: 'bg-brand-light' },
  { name: 'Brand Dark',  hex: '#2F6FBB', tw: 'bg-brand-dark' },
  { name: 'Warm BG',     hex: '#F9F5F0', tw: 'bg-warm', border: true },
  { name: 'Warm Dark',   hex: '#EDE8E2', tw: 'bg-warm-dark', border: true },
  { name: 'Surface',     hex: '#FFFFFF', tw: 'bg-white', border: true },
  { name: 'Success',     hex: '#22c55e', tw: 'bg-green-500' },
  { name: 'Danger',      hex: '#f87171', tw: 'bg-red-400' },
  { name: 'Text',        hex: '#111827', tw: 'bg-gray-900' },
  { name: 'Subtle',      hex: '#9ca3af', tw: 'bg-gray-400' },
];

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}

function ColorSwatch({ name, hex, tw, border }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <button
      onClick={copy}
      className="flex flex-col gap-1 items-center bg-transparent border-none cursor-pointer"
    >
      <div
        className={`w-12 h-12 rounded-lg ${tw} ${border ? 'border border-gray-200' : ''}`}
      />
      <span className="text-xs font-semibold text-gray-700">{name}</span>
      <span className="text-xs text-gray-400">{copied ? 'Copied!' : hex}</span>
    </button>
  );
}

const MOCK_CHORE = { id: 1, name: 'Clean Room', icon: '🛏️', done: false, repeat: 'daily' };
const MOCK_CHORE_DONE = { id: 2, name: 'Laundry', icon: '🧺', done: true, repeat: null };

export default function DesignSystem() {
  const [inputVal, setInputVal] = useState('');
  const [textVal, setTextVal] = useState('');

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <BackButton to="admin-dashboard" />
        <div>
          <div className="text-xl font-extrabold tracking-tight">Design System</div>
          <div className="text-xs text-gray-400">Aeramea component reference</div>
        </div>
      </div>

      {/* Colors */}
      <Section title="Colors">
        <Card>
          <div className="flex flex-wrap gap-4">
            {COLORS.map(c => <ColorSwatch key={c.name} {...c} />)}
          </div>
          <p className="text-xs text-gray-400 mt-3">Tap any swatch to copy hex value</p>
        </Card>
      </Section>

      {/* Typography */}
      <Section title="Typography">
        <Card className="space-y-2">
          <div className="text-2xl font-extrabold tracking-tight text-gray-900">Heading XL</div>
          <div className="text-xl font-extrabold tracking-tight text-gray-900">Heading L</div>
          <div className="text-lg font-bold text-gray-900">Heading M</div>
          <div className="text-base font-semibold text-gray-900">Heading S</div>
          <div className="text-sm font-semibold text-gray-900">Label</div>
          <div className="text-sm text-gray-700">Body — The quick brown fox jumps over the lazy dog.</div>
          <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Section Label</div>
          <div className="text-xs text-gray-400">Caption / metadata text</div>
          <div className="text-sm font-semibold text-brand">Brand link / action</div>
          <div className="text-sm font-semibold text-red-500">Danger / destructive</div>
        </Card>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled>Disabled</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </div>
          <Button fullWidth>Full Width</Button>
        </Card>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge variant="blue">Blue</Badge>
            <Badge variant="green">Green</Badge>
            <Badge variant="red">Red</Badge>
            <Badge variant="orange">Orange</Badge>
            <Badge variant="gray">Gray</Badge>
            <Badge variant="blue">Coming soon</Badge>
            <Badge variant="green">Done</Badge>
            <Badge variant="orange">Pending</Badge>
          </div>
        </Card>
      </Section>

      {/* Inputs */}
      <Section title="Inputs">
        <Card className="space-y-2">
          <Input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="Text input"
          />
          <Input type="date" value="" onChange={() => {}} />
          <Input type="time" value="" onChange={() => {}} />
          <TextArea
            value={textVal}
            onChange={e => setTextVal(e.target.value)}
            placeholder="Text area (3 rows)"
          />
        </Card>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <div className="space-y-2">
          <Card>
            <div className="text-sm font-semibold text-gray-900">Default Card</div>
            <div className="text-xs text-gray-400 mt-0.5">White background, rounded-lg, px-4 py-3</div>
          </Card>
          <Card className="border border-gray-100">
            <div className="text-sm font-semibold text-gray-900">Card with border</div>
            <div className="text-xs text-gray-400 mt-0.5">Add border border-gray-100</div>
          </Card>
          <Card padding={false} className="overflow-hidden">
            <div className="bg-brand px-4 py-2">
              <div className="text-sm font-semibold text-white">Card with header</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-gray-400">Content area with no default padding</div>
            </div>
          </Card>
        </div>
      </Section>

      {/* Progress */}
      <Section title="Progress">
        <Card className="space-y-3">
          <div>
            <div className="text-xs text-gray-400 mb-1.5">Progress Bar — 25%</div>
            <ProgressBar value={25} />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1.5">Progress Bar — 60%</div>
            <ProgressBar value={60} />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1.5">Progress Bar — 100%</div>
            <ProgressBar value={100} />
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-xs text-gray-400">Progress Ring</div>
            <ProgressRing done={2} total={5} size={48} />
            <ProgressRing done={4} total={4} size={48} />
            <ProgressRing done={0} total={3} size={48} />
          </div>
        </Card>
      </Section>

      {/* List components */}
      <Section title="List Components">
        <Card padding={false}>
          <ChoreRow chore={MOCK_CHORE} onClick={() => {}} />
          <ChoreRow chore={MOCK_CHORE_DONE} onClick={() => {}} />
        </Card>
        <div className="mt-2">
          <Card padding={false}>
            <MenuRow onClick={() => {}}>
              <span>Menu Row Item</span><span>›</span>
            </MenuRow>
            <MenuRow onClick={() => {}}>
              <span>Another Row</span><span>›</span>
            </MenuRow>
            <div className="flex justify-between items-center px-4 py-3 opacity-50">
              <span className="text-sm font-semibold text-gray-900">Coming Soon Row</span>
              <Badge variant="gray">Coming soon</Badge>
            </div>
          </Card>
        </div>
      </Section>

      {/* Spacing reference */}
      <Section title="Spacing Scale">
        <Card>
          {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
            <div key={n} className="flex items-center gap-3 mb-1.5">
              <div className="text-xs text-gray-400 w-6">{n}</div>
              <div className="bg-brand rounded" style={{ width: `${n * 4}px`, height: '12px' }} />
              <div className="text-xs text-gray-400">{n * 4}px</div>
            </div>
          ))}
        </Card>
      </Section>
    </div>
  );
}
