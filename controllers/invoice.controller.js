import db from "../libs/db.js";

export const controller_name = async (req, res) => {
    try {
        //codes here
    }catch (err) {
        return res.status(500).json({error: "Server Error"})
    }
}

function calculateTotals(items, discount=0, taxRate=0) {

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
        orderBy: { id: "desc" },
        select: { invoiceNumber: true }
    });

    if (!lastInvoice || !lastInvoice.invoiceNumber) {
        return "INV-0001";
    }

    const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[1], 10);
    const newNumber = (lastNumber + 1).toString().padStart(4, "0");

    return `INV-${newNumber}`;
}

export const get_all_invoices = async (req, res) => {
    try {
        const invoices = await db.invoice.findMany()

        return res.status(200).json({invoices, success: true})
    }catch (err) {
        return res.status(500).json({error: "Server Error"})
    }
}

export const get_user_invoices = async (req, res) => {

    const userId = parseInt(req.userId)
    if(isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID", success: false })
    }

    try {
        const user = await db.user.findUnique({where: {id: userId}})

        if(!user) {
            return res.status(404).json({error: "User not found", success: false})
        }

        const invoices = await db.invoice.findMany({
            where: { userId: userId }
        })

        return res.status(200).json({invoices, success: true})
    }catch (err) {
        return res.status(500).json({error: "Server Error"})
    }
}

export const create_invoice = async (req, res) => {

    const { title, description, customerFirstName, customerLastName, customerMail, customerPhone, customerAddress, items, paymentMethod, discount, terms, taxRate } = req.body

    const tokenUserId = parseInt(req.userId)
    if(isNaN(tokenUserId)) return res.status(400).json({error: "Invalid User ID", success: false})

    if (!title || !description || !customerFirstName || !customerLastName || !customerMail || !items || !items.length || !taxRate || !terms) {
        return res.status(400).json({ error: "Missing required fields", success: false });
    }

    for (const item of items) {
        if (!item.title || typeof item.unitPrice !== 'number' || item.unitPrice <= 0 ||
            typeof item.quantity !== 'number' || item.quantity <= 0 ||
            (item.discount && (item.discount < 0 || item.discount > 100)) ||
            (item.taxRate && item.taxRate < 0)) {
            return res.status(400).json({ error: "Invalid item data", success: false });
        }
    }

    const paymentMethods = ["CASH", "CREDIT_CARD"]

    if(!paymentMethods.includes(paymentMethod)) {
        return res.status(400).json({error: "Invalid payment method", success: false})
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerMail)) {
        return res.status(400).json({ error: "Invalid email format", success: false });
    }

    if (discount && (discount < 0 || discount > 100)) {
        return res.status(400).json({ error: "Discount must be between 0 and 100", success: false });
    }

    if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 100) {
        return res.status(400).json({ error: "Invalid tax rate", success: false });
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

            if(!customer) {
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
    }catch (err) {
        console.log(err)
        return res.status(500).json({ error: "Failed to create invoice", success: false });
    }
}