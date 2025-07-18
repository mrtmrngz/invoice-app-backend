import db from "../libs/db.js";
import puppeteer from "puppeteer";

function calculateTotals(items, discount = 0, taxRate = 0) {

    const subTotal = items.reduce((acc, item) => {
        const itemTotal = (item.unitPrice * item.quantity) * (1 - (item.discount || 0) / 100)
        return acc + itemTotal
    }, 0)

    const discountedPrice = subTotal * (1 - discount / 100)

    const afterTaxPrice = discountedPrice * (1 + taxRate / 100)

    return {
        subTotal: parseFloat(subTotal.toFixed(2)),
        total: parseFloat(afterTaxPrice.toFixed(2))
    }

}

async function generateInvoiceNumber() {
    const lastInvoice = await db.invoice.findFirst({
        orderBy: {id: "desc"},
        select: {invoiceNumber: true}
    });

    if (!lastInvoice || !lastInvoice.invoiceNumber) {
        return "INV-0001";
    }

    const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[1], 10);
    const newNumber = (lastNumber + 1).toString().padStart(4, "0");

    return `INV-${newNumber}`;
}

export const get_user_invoices = async (req, res) => {

    const userId = parseInt(req.userId)
    const { status, total, date } = req.query
    if (isNaN(userId)) {
        return res.status(400).json({error: "Invalid user ID", success: false})
    }

    const whereClause = {}

    try {
        const user = await db.user.findUnique({where: {id: userId}})

        if (!user) {
            return res.status(404).json({error: "User not found", success: false})
        }

        whereClause.userId = userId

        const orderByClause = []

        if(status && typeof status === 'string') {
            const convertedStatus = status.toUpperCase()

            const validStatus = ["PAID", "CANCELLED"]

            if(validStatus.includes(convertedStatus)) {
                whereClause.status = convertedStatus
            }else {
                return res.status(400).json({error: "Invalid status", success: false})
            }
        }

        if(date && typeof date === 'string') {
            if(date === 'asc' || date === 'desc') {
                orderByClause.push({createdAt: date})
            }
        }

        if(total && typeof total === 'string') {
            if(total === 'asc' || total === 'desc') {
                orderByClause.push({total: total})
            }
        }

        const invoices = await db.invoice.findMany({
            where: whereClause,
            orderBy: orderByClause
        })

        return res.status(200).json({invoices, success: true})
    } catch (err) {
        console.log(err)
        return res.status(500).json({error: "Server Error"})
    }
}

export const create_invoice = async (req, res) => {

    const {
        title,
        description,
        customerFirstName,
        customerLastName,
        customerMail,
        customerPhone,
        customerAddress,
        items,
        paymentMethod,
        discount,
        terms,
        taxRate
    } = req.body

    const tokenUserId = parseInt(req.userId)
    if (isNaN(tokenUserId)) return res.status(400).json({error: "Invalid User ID", success: false})

    if (!title || !description || !customerFirstName || !customerLastName || !customerMail || !items || !items.length || !taxRate || !terms) {
        return res.status(400).json({error: "Missing required fields", success: false});
    }

    for (const item of items) {
        if (!item.title || typeof item.unitPrice !== 'number' || item.unitPrice <= 0 ||
            typeof item.quantity !== 'number' || item.quantity <= 0 ||
            (item.discount && (item.discount < 0 || item.discount > 100)) ||
            (item.taxRate && item.taxRate < 0)) {
            return res.status(400).json({error: "Invalid item data", success: false});
        }
    }

    const paymentMethods = ["CASH", "CREDIT_CARD"]

    if (!paymentMethods.includes(paymentMethod)) {
        return res.status(400).json({error: "Invalid payment method", success: false})
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerMail)) {
        return res.status(400).json({error: "Invalid email format", success: false});
    }

    if (discount && (discount < 0 || discount > 100)) {
        return res.status(400).json({error: "Discount must be between 0 and 100", success: false});
    }

    if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 100) {
        return res.status(400).json({error: "Invalid tax rate", success: false});
    }

    try {
        const {total, subTotal} = calculateTotals(items, discount || 0, taxRate)
        const invoiceNumber = await generateInvoiceNumber()


        const invoice = await db.$transaction(async (prisma) => {
            let customer = await prisma.customer.findFirst({
                where: {
                    email: customerMail
                }
            })

            if (!customer) {
                customer = await db.customer.create({
                    data: {
                        firstName: customerFirstName,
                        lastName: customerLastName,
                        email: customerMail,
                        ...(customerPhone && {phone: customerPhone}),
                        ...(customerAddress && {address: customerAddress})
                    }
                })
            }

            const invoice = await prisma.invoice.create({
                data: {
                    title,
                    description,
                    customerId: customer.id,
                    ...(discount && {discount: discount}),
                    userId: tokenUserId,
                    subTotal: subTotal,
                    total: total,
                    invoiceNumber: invoiceNumber,
                    items: {
                        create: items.map((item) => ({
                            title: item.title,
                            unitPrice: item.unitPrice,
                            quantity: item.quantity,
                            subTotal: (item.unitPrice * item.quantity) * (1 - (item.discount || 0) / 100),
                            ...(item.taxRate && {taxRate: item.taxRate}),
                            ...(item.discount && {discount: item.discount}),
                        }))
                    },
                    paymentMethod,
                    taxRate: taxRate || 0,
                    terms,
                    dueDate: new Date(Date.now() + (1000 * 60 * 60 * 24 * 30)),
                },
                include: {
                    items: true
                }
            })

            return invoice
        })

        return res.status(201).json({message: "Invoice created successfully!", success: true, invoice})
    } catch (err) {
        console.log(err)
        return res.status(500).json({error: "Failed to create invoice", success: false});
    }
}

export const download_invoice_as_pdf = async (req, res) => {

    const userId = parseInt(req.userId)
    const invoiceId = parseInt(req.params.id)

    if (isNaN(userId) || isNaN(invoiceId)) {
        return res.status(400).json({error: "Invalid user id or invoice id", success: false})
    }

    try {
        const invoice = await db.invoice.findUnique({
            where: {
                id: invoiceId,
                userId: userId
            },
            include: {
                items: true,
                customer: true,
                user: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        address: true
                    }
                }
            }
        })

        if (!invoice) {
            return res.status(404).json({error: "Invoice not found", success: false})
        }

        const formatDate = (dateString) => {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString('en-US', options);
        };

        const getStatusClass = (status) => {
            switch (status) {
                case 'PAID': return 'status-paid';
                case 'SENT': return 'status-sent';
                case 'DRAFT': return 'status-draft';
                case 'CANCELLED': return 'status-cancelled';
                case 'OVERDUE': return 'status-overdue';
                default: return '';
            }
        };

        const htmlTemplate = `
                                <!DOCTYPE html>
                                <html lang="en">
                                <head>
                                    <meta charset="UTF-8">
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <title>Invoice Details - ${invoice.invoiceNumber}</title>
                                    <!-- Tailwind CSS CDN -->
                                    <script src="https://cdn.tailwindcss.com"></script>
                                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                                    <style>
    body {
        font-family: 'Inter', sans-serif;
        background-color: #f3f4f6;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        min-height: 100vh;
        padding: 20px;
    }
    .invoice-container {
        max-width: 900px;
        width: 100%;
        background-color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        padding: 40px;
        box-sizing: border-box;
    }
    .invoice-header {
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 20px;
        margin-bottom: 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 20px;
        page-break-inside: avoid;
    }
    .invoice-details, .customer-details {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        background-color: #f9fafb; 
        page-break-inside: avoid;
    }
    .invoice-table {
        border-collapse: collapse;
        page-break-inside: avoid;
    }
    .invoice-table th, .invoice-table td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }
    .invoice-table th {
        background-color: #f3f4f6;
        font-weight: 600;
        color: #4b5563;
    }
    .invoice-table tbody tr:last-child td {
        border-bottom: none;
    }
    .invoice-table tbody tr {
        page-break-inside: avoid;
        page-break-after: auto;
    }

    .invoice-summary {
        background-color: #f9fafb;
        border-radius: 8px;
        padding: 20px;
        border: 1px solid #e5e7eb;
        page-break-inside: avoid;
    }
    .invoice-summary div {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
    }
    .invoice-summary .total {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
        border-top: 2px solid #e5e7eb;
        padding-top: 15px;
        margin-top: 10px;
    }
    .invoice-footer {
        border-top: 2px solid #e5e7eb;
        padding-top: 20px;
        margin-top: 30px;
        text-align: center;
        page-break-inside: avoid;
    }
    .terms-section {
        page-break-inside: avoid;
        margin-bottom: 8px;
    }
    .status-badge {
        padding: 6px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.875rem;
        display: inline-block;
    }
    .status-paid {
        background-color: #d1fae5;
        color: #065f46;
    }
    .status-sent {
        background-color: #dbeafe; /* blue-100 */
        color: #1e40af; /* blue-800 */
    }
    .status-draft {
        background-color: #fef3c7; /* yellow-100 */
        color: #92400e; /* yellow-800 */
    }
    .status-overdue {
        background-color: #fee2e2; /* red-100 */
        color: #991b1b; /* red-800 */
    }
    .status-cancelled {
        background-color: #e5e7eb; /* gray-200 */
        color: #4b5563; /* gray-600 */
    }
</style>
                                </head>
                                <body>
                                    <div class="invoice-container">
                                        <!-- Invoice Header -->
                                        <div class="invoice-header">
                                            <div>
                                                <h1 class="text-4xl font-bold text-gray-800 mb-2">INVOICE</h1>
                                                <p class="text-sm text-gray-600">Invoice Number: <span class="font-semibold text-gray-700">${invoice.invoiceNumber}</span></p>
                                                <p class="text-sm text-gray-600">Date: <span class="font-semibold text-gray-700">${formatDate(invoice.createdAt)}</span></p>
                                                <p class="text-sm text-gray-600">Due Date: <span class="font-semibold text-gray-700">${formatDate(invoice.dueDate)}</span></p>
                                            </div>
                                            <div class="text-right">
                                                <!-- Placeholder for Logo -->
                                                <img src="https://placehold.co/150x50/E0F2FE/1E40AF?text=Company+Logo" alt="Company Logo" class="h-12 w-auto rounded-md">
                                                <p class="text-lg font-semibold text-gray-800 mt-2">${invoice.user?.firstName || 'Your'} ${invoice.user?.lastName || 'Company'}</p>
                                                ${invoice.user?.address ? `<p class="text-sm text-gray-600">${invoice.user.address}</p>` : ''}
                                                <p class="text-sm text-gray-600">Email: ${invoice.user?.email || 'info@yourcompany.com'}</p>
                                                ${invoice.user?.phone ? `<p class="text-sm text-gray-600">Phone: ${invoice.user.phone}</p>` : ''}
                                            </div>
                                        </div>
                                
                                        <!-- Billing Details -->
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                            <div class="invoice-details">
                                                <h3 class="text-lg font-semibold text-gray-800 mb-3">Bill To</h3>
                                                <p class="text-gray-700 font-medium">${invoice.customer.firstName} ${invoice.customer.lastName}</p>
                                                ${invoice.customer.companyName ? `<p class="text-gray-600 text-sm">${invoice.customer.companyName}</p>` : ''}
                                                ${invoice.customer.address ? `<p class="text-gray-600 text-sm">${invoice.customer.address}</p>` : ''}
                                                <p class="text-gray-600 text-sm">Email: ${invoice.customer.email}</p>
                                                ${invoice.customer.phone ? `<p class="text-gray-600 text-sm">Phone: ${invoice.customer.phone}</p>` : ''}
                                                ${invoice.customer.taxNumber ? `<p class="text-gray-600 text-sm">Tax ID: ${invoice.customer.taxNumber}</p>` : ''}
                                            </div>
                                            <div class="customer-details">
                                                <h3 class="text-lg font-semibold text-gray-800 mb-3">Invoice Information</h3>
                                                <p class="text-gray-600 text-sm">Invoice Title: <span class="font-medium text-gray-700">${invoice.title}</span></p>
                                                <p class="text-gray-600 text-sm">Description: <span class="font-medium text-gray-700">${invoice.description}</span></p>
                                                <p class="text-gray-600 text-sm">Payment Method: <span class="font-medium text-gray-700">${invoice.paymentMethod}</span></p>
                                                <p class="text-gray-600 text-sm">Status: <span class="status-badge ${getStatusClass(invoice.status)}">${invoice.status}</span></p>
                                            </div>
                                        </div>
                                
                                        <!-- Items Table -->
                                        <div class="mb-8 overflow-x-auto rounded-lg border border-gray-200">
                                            <table class="min-w-full bg-white invoice-table">
                                                <thead>
                                                    <tr>
                                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">Product/Service</th>
                                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rate</th>
                                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount Amount</th>
                                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="divide-y divide-gray-200">
                                                    ${invoice.items.map(item => `
                                                        <tr>
                                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.title}</td>
                                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${item.quantity}</td>
                                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${item.unitPrice.toFixed(2)} TL</td>
                                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${item.taxRate}%</td>
                                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                ${(item.unitPrice * item.quantity * (item.discount / 100)).toFixed(2)} TL
                                                            </td>
                                                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${(item.subTotal * (1 + (item.taxRate / 100))).toFixed(2)} TL</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                
                                        <!-- Summary Section -->
                                        <div class="flex justify-end mb-8">
                                            <div class="w-full md:w-1/2 lg:w-1/3 invoice-summary">
                                                <div>
                                                    <span class="text-gray-600">Subtotal:</span>
                                                    <span class="font-medium text-gray-800">${invoice.subTotal.toFixed(2)} TL</span>
                                                </div>
                                                <div>
                                                    <span class="text-gray-600">Discount:</span>
                                                    <span class="font-medium text-red-600">-${(invoice.subTotal * (invoice.discount / 100)).toFixed(2)} TL</span>
                                                </div>
                                                <div>
                                                    <span class="text-gray-600">Tax (${invoice.taxRate}%):</span>
                                                    <span class="font-medium text-gray-800">
                                                        ${((invoice.subTotal * (1 - invoice.discount / 100)) * (invoice.taxRate / 100)).toFixed(2)} TL
                                                    </span>
                                                </div>
                                                <div class="total">
                                                    <span class="text-gray-800">TOTAL:</span>
                                                    <span class="text-gray-900">${invoice.total.toFixed(2)} TL</span>
                                                </div>
                                            </div>
                                        </div>
                                
                                        <!-- Terms and Conditions -->
                                        <div class="mb-8 terms-section">
                                            <h3 class="text-lg font-semibold text-gray-800 mb-3">Terms and Conditions</h3>
                                            <p class="text-gray-600 text-sm leading-relaxed">
                                                ${invoice.terms}
                                            </p>
                                        </div>
                                
                                        <!-- Footer -->
                                        <div class="invoice-footer">
                                            <p class="text-gray-600 text-sm">Thank you!</p>
                                            <p class="text-gray-600 text-sm">${invoice.user?.firstName || 'Your'} ${invoice.user?.lastName || 'Company'} | ${invoice.user?.email || 'info@yourcompany.com'} | ${invoice.user?.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                </body>
                                </html>
                            `;

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()

        await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' })

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        })

        res.set({
            "Content-Type": 'application/pdf',
            'Content-Disposition': `attachment; filename="fatura-${invoice.invoiceNumber}.pdf"`,
        })

        res.send(pdfBuffer)
    } catch (err) {
        console.log(err)
        return res.status(500).json({error: "Server Error"})
    }
}

export const change_status = async (req, res) => {

    const userId = parseInt(req.userId)
    const invoiceId = parseInt(req.params.id)

    if (isNaN(userId) || isNaN(invoiceId)) {
        return res.status(400).json({error: "Invalid user id or invoice id", success: false})
    }

    try {
        const invoice = await db.invoice.findUnique({
            where: {
                id: invoiceId,
                userId
            }
        })

        if(!invoice) return res.status(404).json({error: "Invoice not found", success: false})

        await db.invoice.update({
            where: {id: invoiceId, userId},
            data: {
                status: "CANCELLED"
            }
        })

        res.status(200).json({message: "Status Change Successfully!", success: true})

    } catch (err) {
        return res.status(500).json({error: "Server Error"})
    }
}