import { ConfigService } from '@nestjs/config';
import { TeeClientService } from './tee-client.service';

describe('TeeClientService', () => {
  let service: TeeClientService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string) => (key === 'tee.url' ? 'http://tee:8000' : null)),
    } as unknown as ConfigService;
    service = new TeeClientService(config);
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('createEscrowWallet calls TEE and returns address', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ address: 'EQxxx', publicKey: 'pk' }),
    });
    const result = await service.createEscrowWallet(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://tee:8000/createEscrowWallet',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dealId: 1 }),
      }),
    );
    expect(result).toEqual({ address: 'EQxxx', publicKey: 'pk' });
  });

  it('checkDeal calls TEE and returns action', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ action: 'released', txHash: '0xabc' }),
    });
    const result = await service.checkDeal(5, -100123);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://tee:8000/checkDeal',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dealId: 5, verificationChatId: -100123 }),
      }),
    );
    expect(result).toEqual({ action: 'released', txHash: '0xabc' });
  });

  it('checkDeal throws when TEE returns not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('error') });
    await expect(service.checkDeal(1, 123)).rejects.toThrow(/TEE checkDeal failed/);
  });
});
