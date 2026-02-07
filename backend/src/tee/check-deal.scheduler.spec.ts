import { DealsService } from '../deals/deals.service';
import { TeeClientService } from './tee-client.service';
import { CheckDealScheduler } from './check-deal.scheduler';

describe('CheckDealScheduler', () => {
  let scheduler: CheckDealScheduler;
  let dealsService: jest.Mocked<Pick<DealsService, 'findActiveDeals' | 'updateDealStatus'>>;
  let teeClient: jest.Mocked<Pick<TeeClientService, 'checkDeal'>>;

  beforeEach(() => {
    dealsService = {
      findActiveDeals: jest.fn(),
      updateDealStatus: jest.fn(),
    };
    teeClient = { checkDeal: jest.fn() };
    scheduler = new CheckDealScheduler(
      dealsService as unknown as DealsService,
      teeClient as unknown as TeeClientService,
    );
  });

  it('calls checkDeal for each active deal and updates on released', async () => {
    dealsService.findActiveDeals.mockResolvedValue([
      { dealId: 1, verificationChatId: BigInt(-100) },
    ]);
    teeClient.checkDeal.mockResolvedValue({ action: 'released', txHash: 'tx1' });

    await scheduler.handleCheckDeals();

    expect(teeClient.checkDeal).toHaveBeenCalledWith(1, -100);
    expect(dealsService.updateDealStatus).toHaveBeenCalledWith(1, 'released', 'tx1');
  });

  it('updates status to refunded when TEE returns refunded', async () => {
    dealsService.findActiveDeals.mockResolvedValue([
      { dealId: 2, verificationChatId: BigInt(-200) },
    ]);
    teeClient.checkDeal.mockResolvedValue({ action: 'refunded' });

    await scheduler.handleCheckDeals();

    expect(dealsService.updateDealStatus).toHaveBeenCalledWith(2, 'refunded', undefined);
  });

  it('does not update when TEE returns pending', async () => {
    dealsService.findActiveDeals.mockResolvedValue([
      { dealId: 3, verificationChatId: BigInt(-300) },
    ]);
    teeClient.checkDeal.mockResolvedValue({ action: 'pending', reason: 'Duration not passed' });

    await scheduler.handleCheckDeals();

    expect(dealsService.updateDealStatus).not.toHaveBeenCalled();
  });

  it('continues with other deals when one checkDeal fails', async () => {
    dealsService.findActiveDeals.mockResolvedValue([
      { dealId: 1, verificationChatId: BigInt(-100) },
      { dealId: 2, verificationChatId: BigInt(-200) },
    ]);
    teeClient.checkDeal
      .mockRejectedValueOnce(new Error('TEE down'))
      .mockResolvedValueOnce({ action: 'released' });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await scheduler.handleCheckDeals();

    expect(teeClient.checkDeal).toHaveBeenCalledTimes(2);
    expect(dealsService.updateDealStatus).toHaveBeenCalledTimes(1);
    expect(dealsService.updateDealStatus).toHaveBeenCalledWith(2, 'released', undefined);
    consoleSpy.mockRestore();
  });
});
