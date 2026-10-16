import { defineConfig } from '@playwright/test';

const e2ePort = Number(process.env.KIDSLAB_E2E_PORT || 4173);
const e2eBaseURL = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // 大型 Three.js 页面和 PWA 离线服务器并发时会争抢软件渲染/端口资源；
  // 本机默认 12 个 worker 会直接耗尽 Chromium 资源而中止测试。保留适度并发，
  // CI 仍串行运行以获得可重复的发布门禁。可用 KIDSLAB_E2E_WORKERS 覆盖。
  workers: process.env.CI ? 1 : (Number(process.env.KIDSLAB_E2E_WORKERS) || 4),
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : 'list',
  // CI runner 无 GPU，WebGL 课件（three.js）软件渲染更慢，放宽超时
  timeout: process.env.CI ? 60000 : 30000,
  use: {
    baseURL: e2eBaseURL,
    screenshot: 'only-on-failure',
    // trace 录制会给每个用例的每次操作补截图，Canvas/WebGL 课件单条 trace
    // 可达数十 MB，录制本身也明显拖慢全量运行：本地只在新重试时录（retries=0
    // 等于不录），CI 保留失败 trace 以便排查。
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    launchOptions: {
      args: process.env.CI
        ? [
            // Chromium 139+ 在无 GPU 环境默认禁用 SwiftShader 软件 WebGL，
            // 缺少该开关时 three.js 课件（plant-lab/magic-cube）初始化挂起导致超时
            '--enable-unsafe-swiftshader',
          ]
        // Headless shell otherwise selects SwiftShader on Windows despite an available GPU.
        // Keep its window-independent animation behavior while using native D3D rendering.
        : process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
    },
  },
  webServer: {
    command: `npm run preview -- ${e2ePort}`,
    url: e2eBaseURL,
    // 复用同端口的任意静态服务器可能让测试误连到其他工作区。
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
