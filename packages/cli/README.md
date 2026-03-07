# Transweave CLI

CLI tool for [Transweave](https://github.com/user/transweave) translation management. Sync translation files between your local project and the Transweave server.

Transweave 翻译管理命令行工具。在本地项目与 Transweave 服务器之间同步翻译文件。

## Installation / 安装

```bash
npm install -g transweave-cli
```

Or use directly with npx: / 或通过 npx 直接使用：

```bash
npx transweave-cli <command>
```

## Quick Start / 快速开始

```bash
# 1. Login with your API key / 使用 API key 登录
transweave login --server https://your-server.com --api-key tw_xxxxx

# 2. Initialize project config / 初始化项目配置
transweave init --project-id <id>

# 3. Pull translations from server / 从服务器拉取翻译
transweave pull

# 4. Push local translations to server / 推送本地翻译到服务器
transweave push
```

## Commands / 命令

### `transweave login`

Save server URL and API key to global config.

将服务器地址和 API key 保存到全局配置。

```bash
transweave login --server <url> --api-key <key>
```

| Option | Required | Description |
|--------|----------|-------------|
| `--server <url>` | Yes | Server URL / 服务器地址 (e.g. `https://your-server.com`) |
| `--api-key <key>` | Yes | API key (must start with `tw_`) / API 密钥（必须以 `tw_` 开头） |

The command validates the API key against the server before saving. Config is stored at `~/.config/transweave/config.json`.

该命令会先向服务器验证 API key 的有效性，然后保存配置到 `~/.config/transweave/config.json`。

### `transweave init`

Initialize project config (`.transweave.json`) in the current directory.

在当前目录初始化项目配置文件（`.transweave.json`）。

```bash
transweave init --project-id <id> [--output-dir <dir>] [--format <fmt>]
```

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--project-id <id>` | Yes | — | Project ID / 项目 ID |
| `--output-dir <dir>` | No | `./src/locales` | Output directory for translation files / 翻译文件输出目录 |
| `--format <fmt>` | No | `json` | Translation file format / 翻译文件格式 |

This fetches the project info from the server (including available languages) and generates a `.transweave.json` file.

该命令从服务器获取项目信息（包括可用语言），生成 `.transweave.json` 配置文件。

Example `.transweave.json` / 示例配置：

```json
{
  "projectId": "abc123",
  "outputDir": "./src/locales",
  "format": "json",
  "languages": ["en", "zh-CN", "ja"]
}
```

### `transweave pull`

Download translations from the server to local files.

从服务器下载翻译文件到本地。

```bash
transweave pull [--format <fmt>] [--output <dir>] [--languages <langs>]
```

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--format <fmt>` | No | From config | Output format / 输出格式 (`json`, `yaml`, `csv`, `xliff`, `po`) |
| `--output <dir>` | No | From config | Output directory / 输出目录 |
| `--languages <langs>` | No | From config | Comma-separated language codes / 逗号分隔的语言代码 (e.g. `en,zh-CN`) |

Files are saved as `<language>.<format>` (e.g. `en.json`, `zh-CN.json`) in the output directory.

翻译文件以 `<语言>.<格式>` 命名（如 `en.json`、`zh-CN.json`）保存到输出目录。

### `transweave push`

Upload local translation files to the server.

将本地翻译文件上传到服务器。

```bash
transweave push [--format <fmt>] [--input <dir>] [--languages <langs>] [--mode <mode>]
```

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--format <fmt>` | No | From config | File format / 文件格式 (`json`, `yaml`, `xliff`, `po`) |
| `--input <dir>` | No | From config | Input directory / 输入目录 |
| `--languages <langs>` | No | Auto-detect | Comma-separated language codes / 逗号分隔的语言代码 |
| `--mode <mode>` | No | `append` | Import mode / 导入模式: `append` or `replace` |

- **append**: Add new keys and update existing ones / 添加新 key 并更新已有 key
- **replace**: Replace all translations for the language / 替换该语言的全部翻译

If `--languages` is not specified, the CLI auto-detects languages by scanning the input directory for files matching `*.<format>`.

若未指定 `--languages`，CLI 会自动扫描输入目录中匹配 `*.<格式>` 的文件来检测语言。

## Configuration / 配置

### Global Config / 全局配置

Stored at `~/.config/transweave/config.json`. Created by `transweave login`.

存储于 `~/.config/transweave/config.json`，由 `transweave login` 创建。

```json
{
  "server": "https://your-server.com",
  "apiKey": "tw_xxxxx"
}
```

### Project Config / 项目配置

Stored at `.transweave.json` in your project root. Created by `transweave init`.

存储于项目根目录的 `.transweave.json`，由 `transweave init` 创建。

### Environment Variables / 环境变量

Environment variables take priority over config files.

环境变量优先级高于配置文件。

| Variable | Description |
|----------|-------------|
| `TRANSWEAVE_API_KEY` | API key, overrides global config / API 密钥，覆盖全局配置 |
| `TRANSWEAVE_SERVER` | Server URL, overrides global config / 服务器地址，覆盖全局配置 |

## CI/CD Integration / CI/CD 集成

Example GitHub Actions workflow to pull translations on deploy:

在部署时拉取翻译的 GitHub Actions 示例：

```yaml
- name: Pull translations
  env:
    TRANSWEAVE_API_KEY: ${{ secrets.TRANSWEAVE_API_KEY }}
    TRANSWEAVE_SERVER: https://your-server.com
  run: |
    npx transweave-cli init --project-id ${{ vars.PROJECT_ID }}
    npx transweave-cli pull
```

## Development / 开发

```bash
# Install dependencies / 安装依赖
pnpm install

# Run in dev mode / 开发模式运行
pnpm --filter transweave-cli run dev

# Build / 构建
pnpm --filter transweave-cli run build
```

## License

MIT
