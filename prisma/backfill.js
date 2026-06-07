const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('Starting backfill script...');

  try {
    const users = await db.user.findMany();
    console.log(`Found ${users.length} user(s) to process.`);

    for (const user of users) {
      console.log(`Processing user: ${user.email} (ID: ${user.id})`);

      // 1. Fetch all financial entries for this user with useSalaryBalance = true
      const entries = await db.financialEntry.findMany({
        where: {
          userId: user.id,
          useSalaryBalance: true,
          salaryMonth: { not: null },
          salaryYear: { not: null }
        },
        orderBy: { date: 'asc' }
      });

      console.log(`Found ${entries.length} useSalaryBalance entries for user.`);

      // Group entries by year-month
      const grouped = {};
      for (const entry of entries) {
        const key = `${entry.salaryYear}-${entry.salaryMonth}`;
        if (!grouped[key]) {
          grouped[key] = {
            month: entry.salaryMonth,
            year: entry.salaryYear,
            items: []
          };
        }
        grouped[key].items.push(entry);
      }

      // Process each group
      for (const key of Object.keys(grouped)) {
        const { month, year, items } = grouped[key];
        console.log(`  Processing Period: ${month}/${year} with ${items.length} entries.`);

        // Find existing salary
        const salaryRecord = await db.salary.findUnique({
          where: {
            userId_month_year: {
              userId: user.id,
              month,
              year
            }
          }
        });

        const salaryAmount = salaryRecord ? Number(salaryRecord.amount) : 0;
        const totalSpent = items.reduce((sum, item) => sum + Number(item.amount), 0);

        console.log(`    Total Salary: ${salaryAmount}, Total Spent: ${totalSpent}`);

        let bonusAmount = 0;

        // If spending exceeds salary, create a balancing bonus
        if (totalSpent > salaryAmount) {
          const neededBonus = totalSpent - salaryAmount;
          console.log(`    Spending exceeds salary. Creating balancing bonus of: ${neededBonus}`);

          const existingBonus = await db.bonus.findUnique({
            where: {
              userId_month_year: {
                userId: user.id,
                month,
                year
              }
            }
          });

          if (existingBonus) {
            const updatedBonus = await db.bonus.update({
              where: { id: existingBonus.id },
              data: { amount: Number(existingBonus.amount) + neededBonus }
            });
            bonusAmount = Number(updatedBonus.amount);
          } else {
            const newBonus = await db.bonus.create({
              data: {
                userId: user.id,
                month,
                year,
                amount: neededBonus
              }
            });
            bonusAmount = Number(newBonus.amount);
          }
        } else {
          // Fetch existing bonus if any
          const existingBonus = await db.bonus.findUnique({
            where: {
              userId_month_year: {
                userId: user.id,
                month,
                year
              }
            }
          });
          bonusAmount = existingBonus ? Number(existingBonus.amount) : 0;
        }

        console.log(`    Final Pool - Salary: ${salaryAmount}, Bonus: ${bonusAmount}`);

        // Now delete any existing deductions for these entries to avoid duplicates if rerun
        const entryIds = items.map(i => i.id);
        await db.salaryDeduction.deleteMany({
          where: { entryId: { in: entryIds } }
        });

        // Distribute deductions
        let remainingSalary = salaryAmount;
        let remainingBonus = bonusAmount;

        for (const entry of items) {
          const amountToDeduct = Number(entry.amount);
          let rem = amountToDeduct;

          const deductionsToCreate = [];

          // Deduct from Salary first
          if (remainingSalary > 0) {
            const deductSal = Math.min(rem, remainingSalary);
            deductionsToCreate.push({
              entryId: entry.id,
              month,
              year,
              amount: deductSal,
              type: 'SALARY'
            });
            remainingSalary -= deductSal;
            rem -= deductSal;
          }

          // Deduct from Bonus next
          if (rem > 0 && remainingBonus > 0) {
            const deductBon = Math.min(rem, remainingBonus);
            deductionsToCreate.push({
              entryId: entry.id,
              month,
              year,
              amount: deductBon,
              type: 'BONUS'
            });
            remainingBonus -= deductBon;
            rem -= deductBon;
          }

          if (rem > 0.01) {
            console.warn(`    [WARNING] Could not fully deduct transaction ID ${entry.id} (${entry.title}). Unallocated remainder: ${rem}`);
          }

          // Insert deductions
          if (deductionsToCreate.length > 0) {
            await db.salaryDeduction.createMany({
              data: deductionsToCreate
            });
          }
        }
      }
    }

    console.log('Backfill successfully completed.');
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
