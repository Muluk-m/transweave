import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TokenService } from '../service/token.service';

@Controller('api/badge')
export class BadgeController {
  constructor(private readonly tokenService: TokenService) {}

  @Get(':projectId')
  @Header('Cache-Control', 'max-age=300')
  @Header('Content-Type', 'image/svg+xml')
  async getBadge(
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    let percentage = 0;
    try {
      const progress = await this.tokenService.getLanguageCompletion(projectId);
      if (progress.length > 0) {
        const total = progress.reduce((sum, p) => sum + p.percentage, 0);
        percentage = Math.round(total / progress.length);
      }
    } catch {
      // Return 0% badge on error
    }

    const color =
      percentage > 80 ? '#4c1' : percentage > 50 ? '#dfb317' : '#e05d44';
    const label = 'translations';
    const value = `${percentage}%`;
    const labelWidth = label.length * 6.5 + 10;
    const valueWidth = value.length * 7.5 + 10;
    const totalWidth = labelWidth + valueWidth;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;

    res.send(svg);
  }
}
