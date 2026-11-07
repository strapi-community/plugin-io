import net from 'node:net';

/**
 * Checks that a value is an IPv4/IPv6 address or a CIDR block.
 *
 * @param {unknown} value - Candidate entry.
 * @returns {boolean} True when the entry is usable in an IP rule list.
 */
function isValidIpOrCidr(value) {
	if (typeof value !== 'string' || value.length === 0 || value.length > 64) return false;
	const [address, mask, extra] = value.split('/');
	if (extra !== undefined) return false;
	const family = net.isIP(address);
	if (family === 0) return false;
	if (mask === undefined) return true;
	if (!/^\d{1,3}$/.test(mask)) return false;
	const prefix = Number(mask);
	return family === 4 ? prefix <= 32 : prefix <= 128;
}

/**
 * Builds a `net.BlockList` from address and CIDR entries. Invalid entries are skipped.
 *
 * @param {string[]} entries - Addresses or CIDR blocks.
 * @returns {net.BlockList} The block list.
 * @see https://nodejs.org/api/net.html#class-netblocklist
 */
function buildBlockList(entries) {
	const list = new net.BlockList();
	for (const entry of entries || []) {
		if (!isValidIpOrCidr(entry)) continue;
		const [address, mask] = entry.split('/');
		const type = net.isIP(address) === 6 ? 'ipv6' : 'ipv4';
		if (mask === undefined) list.addAddress(address, type);
		else list.addSubnet(address, Number(mask), type);
	}
	return list;
}

/**
 * Tests an address against a block list, handling IPv4-mapped IPv6 addresses.
 *
 * @param {net.BlockList} list - Block list.
 * @param {string} ip - Client address.
 * @returns {boolean} True when the address matches.
 */
function matches(list, ip) {
	if (typeof ip !== 'string') return false;
	const mapped = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
	const family = net.isIP(mapped);
	if (family === 0) return false;
	return list.check(mapped, family === 6 ? 'ipv6' : 'ipv4');
}

/**
 * Creates an IP rule checker from allow and block lists.
 * An empty allow list allows every address that is not blocked.
 *
 * @param {{ ipWhitelist?: string[], ipBlacklist?: string[] }} security - Security settings.
 * @returns {(ip: string) => boolean} Returns true when the address may connect.
 */
function createIpRules(security) {
	const allow = security?.ipWhitelist || [];
	const block = security?.ipBlacklist || [];
	const allowList = buildBlockList(allow);
	const blockList = buildBlockList(block);
	return (ip) => {
		if (block.length && matches(blockList, ip)) return false;
		if (allow.length && !matches(allowList, ip)) return false;
		return true;
	};
}

export { createIpRules, isValidIpOrCidr };
