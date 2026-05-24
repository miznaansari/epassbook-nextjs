import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Fetch salary entries for a user, optionally filtered by month and year
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const where = { userId };
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const salaries = await db.salary.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return NextResponse.json(salaries);
  } catch (error) {
    console.error('Error in /api/salary GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Add or update a salary entry month-wise
export async function POST(req) {
  try {
    const { userId, amount, month, year } = await req.json();

    if (!userId || amount === undefined || !month || !year) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);

    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ error: 'Invalid salary amount' }, { status: 400 });
    }
    if (parsedMonth < 1 || parsedMonth > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
    }

    // Prisma upsert handles adding or updating seamlessly
    const salary = await db.salary.upsert({
      where: {
        userId_month_year: {
          userId,
          month: parsedMonth,
          year: parsedYear,
        },
      },
      update: {
        amount: parsedAmount,
      },
      create: {
        userId,
        amount: parsedAmount,
        month: parsedMonth,
        year: parsedYear,
      },
    });

    return NextResponse.json(salary);
  } catch (error) {
    console.error('Error in /api/salary POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
