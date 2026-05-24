import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Fetch entries for a user, optionally filtered by type, date range, or salary month/year
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const salaryMonth = searchParams.get('salaryMonth');
    const salaryYear = searchParams.get('salaryYear');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const where = { userId };

    if (type) {
      where.type = type;
    }

    // Filter by date range (for cycles and dashboard filtering)
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Filter by specific salary balance linked deductions
    if (salaryMonth) where.salaryMonth = parseInt(salaryMonth);
    if (salaryYear) where.salaryYear = parseInt(salaryYear);

    const entries = await db.financialEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error in /api/entries GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new financial entry
export async function POST(req) {
  try {
    const {
      userId,
      amount,
      title,
      description,
      type,
      useSalaryBalance,
      salaryMonth,
      salaryYear,
      date,
    } = await req.json();

    if (!userId || amount === undefined || !title || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid financial amount' }, { status: 400 });
    }

    const validTypes = ['LENDING', 'LOAN', 'SPENDING', 'ADVANCE', 'SAVINGS'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 });
    }

    const entryData = {
      userId,
      amount: parsedAmount,
      title,
      description: description || '',
      type,
      useSalaryBalance: !!useSalaryBalance,
      date: date ? new Date(date) : new Date(),
    };

    // If Use Salary Balance is selected, associate it with a specific month/year
    if (useSalaryBalance) {
      if (!salaryMonth || !salaryYear) {
        return NextResponse.json({ error: 'Salary month and year are required when Use Salary Balance is checked' }, { status: 400 });
      }
      entryData.salaryMonth = parseInt(salaryMonth);
      entryData.salaryYear = parseInt(salaryYear);
    }

    const entry = await db.financialEntry.create({
      data: entryData,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error in /api/entries POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete a financial entry
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
    }

    await db.financialEntry.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/entries DELETE:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
