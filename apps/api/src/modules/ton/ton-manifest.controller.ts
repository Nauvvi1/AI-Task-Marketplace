import { Controller, Get } from '@nestjs/common';

@Controller('tonconnect-manifest.json')
export class TonManifestController {
  @Get()
  getManifest() {
    const baseUrl = process.env.WEB_URL;

    if (!baseUrl) {
      throw new Error('WEB_URL is not configured');
    }

    return {
      url: baseUrl,
      name: 'Nauvvi',
      iconUrl: `${baseUrl}/icon.png`,
      termsOfUseUrl: baseUrl,
      privacyPolicyUrl: baseUrl,
    };
  }
}