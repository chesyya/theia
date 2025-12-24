import { PluginSharedStyle } from "../plugin-shared-style";

export namespace SvgIconManager {
    const svgIcons: Record<string, string> = {};

    // 检查是否为URL
    function isUrl(str: string): boolean {
        try {
            new URL(str);
            return true;
        } catch {
            return str.startsWith('http://') ||
                str.startsWith('https://') ||
                str.startsWith('/') ||
                str.startsWith('./') ||
                str.startsWith('../');
        }
    }

    // 工具函数：将 SVG 转换为 Data URI
    function svgToDataUri(svgString: string): string {
        // 清理 SVG 字符串
        const cleanSvg = svgString
            .replace(/\s+/g, ' ')
            .replace(/[\r\n\t]/g, '')
            .trim();

        // 编码为 Data URI
        const encoded = encodeURIComponent(cleanSvg);
        return `data:image/svg+xml,${encoded}`;
    }

    function generateSvgCssClasses(icons: Record<string, string>): string {
        let cssString = '';

        Object.entries(icons).forEach(([name, svg]) => {
            let backgroundImage: string;

            // 判断是URL还是SVG代码
            if (isUrl(svg)) {
                backgroundImage = `url("${svg}")`;
            } else {
                backgroundImage = `url("${svgToDataUri(svg)}")`;
            }

            cssString += `
            .${name} {
                display: inline-block;
                width: 12px;
                height: 12px;
                background-image: ${backgroundImage};
                background-repeat: no-repeat;
                background-size: contain;
                background-position: center;
            }

            .${name}::before {
                content: '';
                display: inline-block;
                width: 100%;
                height: 100%;
            }
            `;
        });

        return cssString;
    }

    // 动态插入 CSS 到页面
    function injectSvgStyles(icons: Record<string, string>): void {
        const cssString = generateSvgCssClasses(icons);

        // 创建 style 元素
        const styleElement = document.createElement('style');
        styleElement.type = 'text/css';
        styleElement.textContent = cssString;
        document.head.appendChild(styleElement);
    }

    // 获取所有图标名称
    function getIconNames(): string[] {
        return Object.keys(svgIcons);
    }

    // 添加新图标（支持SVG代码或URL）
    export function addIcon(name: string, svgOrUrl: string): void {
        const iconUrl = PluginSharedStyle.toExternalIconUrl(svgOrUrl);
        svgIcons[name] = iconUrl;
        // 重新生成样式
        injectSvgStyles({ [name]: iconUrl });
    }

    // 批量添加图标
    export function addIcons(icons: Record<string, string>): void {
        Object.assign(svgIcons, icons);
        injectSvgStyles(icons);
    }

    // 初始化所有图标样式
    export function initialize(): void {
        if (Object.keys(svgIcons).length > 0) {
            injectSvgStyles(svgIcons);
        }
    }

    // 获取图标类型（URL或SVG）
    export function getIconType(name: string): 'url' | 'svg' | 'not-found' {
        const icon = svgIcons[name];
        if (!icon) return 'not-found';
        return isUrl(icon) ? 'url' : 'svg';
    }
}

export interface IconProps {
    name: string;
    className?: string;
    size?: number;
}
