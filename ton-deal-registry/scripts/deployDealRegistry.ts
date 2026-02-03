import { Address, toNano } from '@ton/core';
import { DealRegistry } from '../wrappers/DealRegistry';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // TEE Hot Wallet address - only this address can create deals
    const adminAddress = Address.parse('UQCIwT9RRC1daHif6mqIIH-qhyXySHWc3lIlMunigwL83jND');

    const dealRegistry = provider.open(
        DealRegistry.createFromConfig(
            { admin: adminAddress },
            await compile('DealRegistry')
        )
    );

    await dealRegistry.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(dealRegistry.address);

    console.log('Deal Registry deployed at:', dealRegistry.address.toString());
    console.log('Admin (TEE Hot Wallet):', adminAddress.toString());
}
