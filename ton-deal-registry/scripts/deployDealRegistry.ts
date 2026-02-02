import { toNano } from '@ton/core';
import { DealRegistry } from '../wrappers/DealRegistry';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const dealRegistry = provider.open(DealRegistry.createFromConfig({}, await compile('DealRegistry')));

    await dealRegistry.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(dealRegistry.address);

    // run methods on `dealRegistry`
}
