import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    } else if (
      promptLower.includes("sidebar") ||
      promptLower.includes("menu") ||
      promptLower.includes("nav")
    ) {
      componentType = "sidebar";
      componentName = "Sidebar";
    } else if (
      promptLower.includes("table") ||
      promptLower.includes("list") ||
      promptLower.includes("data")
    ) {
      componentType = "table";
      componentName = "DataTable";
    } else if (
      promptLower.includes("dashboard") ||
      promptLower.includes("stat") ||
      promptLower.includes("metric")
    ) {
      componentType = "dashboard";
      componentName = "Dashboard";
    } else if (
      promptLower.includes("profile") ||
      promptLower.includes("avatar") ||
      promptLower.includes("user")
    ) {
      componentType = "profile";
      componentName = "ProfileCard";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-2xl shadow-md border border-gray-200 font-sans">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Contact Us</h2>
      <p className="text-sm text-gray-500 mb-6">We'll get back to you within 24 hours.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Jane Smith"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="jane@example.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            placeholder="How can we help?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors duration-150"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({
  title = "Welcome to Our Service",
  description = "Discover amazing features and capabilities that will transform your experience.",
  badge,
  imageUrl,
  actions
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden font-sans transition-shadow duration-150 hover:shadow-md">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        {badge && (
          <span className="inline-block mb-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
            {badge}
          </span>
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        {actions && (
          <div className="mt-5 flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;`;

      case "sidebar":
        return `import { useState } from 'react';

const navItems = [
  { icon: '⊞', label: 'Dashboard', href: '#', active: true },
  { icon: '📊', label: 'Analytics', href: '#' },
  { icon: '📁', label: 'Projects', href: '#' },
  { icon: '👥', label: 'Team', href: '#' },
  { icon: '📅', label: 'Calendar', href: '#' },
  { icon: '⚙️', label: 'Settings', href: '#' },
];

const Sidebar = () => {
  const [active, setActive] = useState('Dashboard');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={\`flex flex-col bg-white border-r border-gray-200 font-sans transition-all duration-200 \${collapsed ? 'w-16' : 'w-60'}\`}>
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        {!collapsed && (
          <span className="text-base font-semibold text-gray-900 truncate">Workspace</span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors duration-150 ml-auto"
          aria-label="Toggle sidebar"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon, label, href }) => (
          <a
            key={label}
            href={href}
            onClick={e => { e.preventDefault(); setActive(label); }}
            className={\`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 \${
              active === label
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }\`}
          >
            <span className="text-base shrink-0">{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}
          </a>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-gray-100">
        <div className={\`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors duration-150 \${collapsed ? 'justify-center' : ''}\`}>
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
            JD
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Jane Doe</p>
              <p className="text-xs text-gray-500 truncate">jane@example.com</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;`;

      case "table":
        return `import { useState } from 'react';

const people = [
  { id: 1, name: 'Alice Johnson', role: 'Engineer', status: 'Active', joined: 'Jan 2023' },
  { id: 2, name: 'Bob Smith', role: 'Designer', status: 'Active', joined: 'Mar 2023' },
  { id: 3, name: 'Carol White', role: 'Manager', status: 'Away', joined: 'Nov 2022' },
  { id: 4, name: 'Dan Brown', role: 'Engineer', status: 'Inactive', joined: 'Jul 2023' },
  { id: 5, name: 'Eva Green', role: 'Marketing', status: 'Active', joined: 'Feb 2024' },
];

const statusColors = {
  Active: 'bg-green-100 text-green-700',
  Away: 'bg-amber-100 text-amber-700',
  Inactive: 'bg-gray-100 text-gray-500',
};

const DataTable = () => {
  const [search, setSearch] = useState('');

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden font-sans">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-500">{filtered.length} people</p>
        </div>
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 w-48"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left">
            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-10 text-center text-gray-400">No results found</td>
            </tr>
          ) : filtered.map(person => (
            <tr key={person.id} className="hover:bg-gray-50 transition-colors duration-100">
              <td className="px-6 py-3 font-medium text-gray-900">{person.name}</td>
              <td className="px-6 py-3 text-gray-500">{person.role}</td>
              <td className="px-6 py-3">
                <span className={\`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium \${statusColors[person.status]}\`}>
                  {person.status}
                </span>
              </td>
              <td className="px-6 py-3 text-gray-500">{person.joined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;`;

      case "dashboard":
        return `const stats = [
  { label: 'Total Revenue', value: '$48,295', change: '+12%', up: true },
  { label: 'Active Users', value: '3,842', change: '+5%', up: true },
  { label: 'Bounce Rate', value: '24.6%', change: '-3%', up: false },
  { label: 'Avg. Session', value: '4m 32s', change: '+8%', up: true },
];

const Dashboard = () => (
  <div className="space-y-6 font-sans">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
      <p className="text-sm text-gray-500 mt-0.5">Last 30 days</p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      {stats.map(({ label, value, change, up }) => (
        <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className={\`text-xs font-medium mt-1 \${up ? 'text-green-600' : 'text-red-500'}\`}>
            {change} vs last month
          </p>
        </div>
      ))}
    </div>

    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Activity</h2>
      <div className="flex items-end gap-1.5 h-24">
        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 50].map((h, i) => (
          <div key={i} className="flex-1 bg-indigo-100 rounded-t hover:bg-indigo-400 transition-colors duration-150" style={{ height: \`\${h}%\` }} />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>Jan</span><span>Jun</span><span>Dec</span>
      </div>
    </div>
  </div>
);

export default Dashboard;`;

      case "profile":
        return `const ProfileCard = ({
  name = "Jane Doe",
  role = "Senior Product Designer",
  location = "San Francisco, CA",
  bio = "Crafting intuitive digital experiences for over 8 years. Passionate about design systems and accessibility.",
  stats = [{ label: 'Projects', value: '42' }, { label: 'Followers', value: '1.2k' }, { label: 'Following', value: '180' }],
}) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden font-sans max-w-sm">
    <div className="h-24 bg-gradient-to-r from-indigo-500 to-violet-500" />
    <div className="px-6 pb-6">
      <div className="-mt-10 mb-4 flex items-end justify-between">
        <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold border-4 border-white shadow-sm">
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <button className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors duration-150">
          Follow
        </button>
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
      <p className="text-sm text-indigo-600 font-medium">{role}</p>
      <p className="text-xs text-gray-500 mt-0.5">📍 {location}</p>
      <p className="text-sm text-gray-600 mt-3 leading-relaxed">{bio}</p>
      <div className="mt-5 grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
        {stats.map(({ label, value }) => (
          <div key={label} className="py-3 text-center">
            <p className="text-base font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ProfileCard;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 font-sans">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Counter</h2>
      <p className="text-sm text-gray-500 mb-6">Click to increment or decrement</p>
      <div className={\`text-6xl font-bold mb-8 tabular-nums \${count > 0 ? 'text-indigo-600' : count < 0 ? 'text-red-500' : 'text-gray-900'}\`}>
        {count}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setCount(prev => prev - 1)}
          className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 transition-colors duration-150"
        >
          −
        </button>
        <button
          onClick={() => setCount(0)}
          className="px-5 py-2.5 bg-white border border-gray-300 text-gray-500 rounded-lg font-medium hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={count === 0}
        >
          Reset
        </button>
        <button
          onClick={() => setCount(prev => prev + 1)}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors duration-150"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>';
      default:
        return "  const [count, setCount] = useState(0);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{title}</h3>';
      default:
        return "  const [count, setCount] = useState(0);\n  const [history, setHistory] = useState([]);";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Sidebar") {
      return `import Sidebar from '@/components/Sidebar';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Content</h1>
          <p className="text-gray-500">Select an item from the sidebar to get started.</p>
        </div>
      </main>
    </div>
  );
}`;
    }

    if (componentName === "DataTable") {
      return `import DataTable from '@/components/DataTable';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <DataTable />
      </div>
    </div>
  );
}`;
    }

    if (componentName === "Dashboard") {
      return `import Dashboard from '@/components/Dashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-xl mx-auto">
        <Dashboard />
      </div>
    </div>
  );
}`;
    }

    if (componentName === "ProfileCard") {
      return `import ProfileCard from '@/components/ProfileCard';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-sans">
      <ProfileCard />
    </div>
  );
}`;
    }

    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-sm">
        <Card
          badge="Featured"
          title="Amazing Product"
          description="This is a fantastic product that will change your life. Experience the difference today!"
          actions={
            <>
              <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors duration-150">
                Learn More
              </button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 transition-colors duration-150">
                Save
              </button>
            </>
          }
        />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
