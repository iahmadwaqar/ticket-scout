import { useState } from 'react';

/**
 * Test component to verify hot module replacement is working
 * This component should update without full page refresh when modified
 */
export function HotReloadTest() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Hot reload is working!');

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
      <h3 className="text-lg font-semibold mb-2">Hot Reload Test Component</h3>
      <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCount(count + 1)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Count: {count}
        </button>
        <button
          onClick={() => setMessage(message === 'Hot reload is working!' ? 'HMR Test Updated!' : 'Hot reload is working!')}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Toggle Message
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Modify this component to test hot module replacement
      </p>
    </div>
  );
}