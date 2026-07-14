import { describe, it, afterAll, expect} from 'vitest';
import { prisma } from '../src/index.js';

describe('Database connection', () => {
    afterAll(async () => {
        await prisma.$disconnect(); // 測完關連線，不然 Node process 會因為連線還開著而不退出，test runner 會 hang\
    })

    it('能連上DB', async () => {
        // Act
        const res = await prisma.$queryRaw`SELECT 1 AS ok`;
        // Assert
        expect(res).toEqual([{ok:1}]);
    })
}) 