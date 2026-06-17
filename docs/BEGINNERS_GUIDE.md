# 🛍️ HUBTEL PAYMENT SETUP - BEGINNER'S GUIDE
## For Non-Developers

**By:** AI Assistant  
**For:** FMM CLASSICO Team  
**Date:** June 17, 2026  

---

## 👋 HELLO!

You don't need to be a developer to understand what we've built. This guide explains EVERYTHING in simple words.

---

## 🎯 WHAT JUST HAPPENED?

We've connected your website to **Hubtel**, a payment system that lets customers pay with:
- 📱 MTN Mobile Money
- 📱 Telecel Cash  
- 📱 AirtelTigo Money
- 💳 Bank Cards
- 📲 Mobile wallets

**Before:** Customers couldn't pay online  
**Now:** Customers can pay directly through your website! 💰

---

## 💻 WHAT'S BEEN BUILT FOR YOU

### Part 1: Payment Form (What customers see)
When a customer clicks "Pay" on your website, they see:
- Text box to enter their **email**
- Text box to enter their **phone number**
- Text box to enter their **name**
- Big button saying "Pay ₵100" (or whatever amount)

When they click the button, they're sent to Hubtel's secure payment page.

### Part 2: Hubtel Checkout Page (What Hubtel controls)
On Hubtel's page, customer:
1. Selects how they want to pay (MTN, Telecel, Bank Card, etc.)
2. Enters payment details
3. Confirms payment
4. Hubtel processes the payment

### Part 3: Order Confirmation (What happens after)
After payment succeeds:
1. Customer is sent back to your website
2. Their order is **automatically created** in your system
3. Customer sees "Order Confirmed!" page  
4. Customer gets an **email confirmation**
5. **You get notified** in the admin dashboard

### Part 4: Admin Dashboard (For you to manage)
In your admin panel, you can:
- See all new orders
- See payment status
- Mark orders for shipping
- Track delivery

---

## 📂 WHERE YOUR FILES ARE

All the payment code is in one folder: `docs/`

### Important Files:

| File | What It Is | For Whom |
|------|-----------|---------|
| `HUBTEL_IMPLEMENTATION_SUMMARY.md` | Overview of everything | Everyone |
| `HUBTEL_UAT_GUIDE.md` | Testing guide | Hubtel & You |
| `HUBTEL_WEBHOOK_CALLBACK.md` | Backend code | Your Developer |
| `FMM_CLASSICO_HUBTEL_PAYMENT_FLOW.pptx` | Visual diagram | Hubtel & Investors |

---

## 🚀 STEP-BY-STEP: WHAT TO DO NOW

### Step 1: Test It Yourself (Takes 10 minutes)

1. Open your website: https://www.fmmclassico.com
2. Add something to your cart 🛒
3. Go to checkout
4. Fill in delivery address
5. Click "Proceed to Payment"
6. You should see the payment form
7. Click the "Pay" button
8. You should be redirected to Hubtel's page

**If you see this:** ✅ It's working!  
**If you see an error:** ❌ Something's wrong - contact your developer

### Step 2: Get Test Payment Methods (From Hubtel)

Hubtel needs to give you **fake payment methods** for testing.

Send them this email:

```
Subject: Test Payment Methods Needed

Hi Hubtel Team,

We're ready to test our payment integration with FMM CLASSICO.

Please provide test payment methods for:
1. Successful payment (phone number or test card)
2. Failed payment (phone number or test card)
3. Cancelled payment scenario

Merchant Account: 2039285

Thank you!
```

They will respond with something like:
```
Test Phone for Success: 0500000001
Test Phone for Failure: 0500000002
Test Card: 4111111111111111
```

### Step 3: Test Different Scenarios (Takes 1 hour)

**Test 1: Successful Payment**
- Use the SUCCESS test phone/card
- Complete payment
- Check: Order appears in your admin panel ✅
- Check: You received email notification ✅
- Check: Customer sees "Order Confirmed" ✅

**Test 2: Failed Payment**
- Use the FAILURE test phone/card
- Payment should fail
- Check: NO order is created ✅
- Check: Error message shows ✅
- Check: Customer can try again ✅

**Test 3: Cancelled Payment**
- Start payment process
- Cancel on Hubtel's page
- Check: NO order is created ✅
- Check: Customer sees "Cancelled" message ✅

Take **screenshots** of each scenario!

### Step 4: Create Payment Flow Diagram

Create a PowerPoint or PDF document showing:

```
WHAT CUSTOMERS SEE:

1. Customer in shop
2. Clicks "Checkout"
3. Enters delivery address
4. Sees payment form
5. Enters email, phone, name
6. Clicks "Pay"
7. Sent to Hubtel page
8. Selects payment method
9. Enters payment details
10. Payment completes
11. Returned to your website
12. Sees "Order Confirmed!"
13. Gets email confirmation
```

**Save this as:** `docs/FMM_CLASSICO_HUBTEL_PAYMENT_FLOW.pptx`

### Step 5: Send Everything to Hubtel

Collect these files and send to Hubtel:

```
📎 Attachment 1: HUBTEL_UAT_GUIDE.md
📎 Attachment 2: HUBTEL_WEBHOOK_CALLBACK.md  
📎 Attachment 3: FMM_CLASSICO_HUBTEL_PAYMENT_FLOW.pptx
📎 Attachment 4: Screenshot of payment form
📎 Attachment 5: Screenshot of success page
📎 Attachment 6: Screenshot of order confirmation
```

Email Template:

```
Subject: FMM CLASSICO - Hubtel Integration Complete - Ready for UAT

Dear Hubtel Team,

We have successfully integrated Hubtel Online Checkout into FMM CLASSICO.

WHAT WE'VE BUILT:
- Online payment form
- Secure checkout with Hubtel
- Automatic order creation
- Customer email confirmations
- Admin order management
- Transaction tracking

MERCHANT ACCOUNT: 2039285
LIVE WEBSITE: https://www.fmmclassico.com
ADMIN DASHBOARD: https://www.fmmclassico.com/AdminOrders

ATTACHED DOCUMENTATION:
1. Complete UAT Testing Guide
2. Webhook Implementation Details
3. Payment Flow Diagram
4. Test Screenshots

WE ARE READY FOR:
- UAT Testing
- Live merchant account setup
- IP whitelisting
- Go-live within 1 week

Please confirm receipt and let us know next steps.

Thank you,
FMM CLASSICO Development Team
Phone: 0509896035
Email: fmmclassico@gmail.com
```

---

## 🎓 SIMPLE EXPLANATIONS

### What is "Merchant Account"?

Think of it as your **bank account** but for receiving payments through Hubtel.
- Customers send money TO this account
- You receive money FROM this account

**Your account:** 2039285

### What is "API"?

API = A way for programs to talk to each other.

**Without API:** You'd have to manually record every payment  
**With API:** Hubtel tells your website about payment automatically

### What is "Callback"?

A **message from Hubtel to your server**.

**How it works:**
1. Customer pays on Hubtel
2. Hubtel sends a message to your server
3. Your server creates the order
4. Customer automatically gets confirmation

**Like a phone call:**
- You call Hubtel (API request) = "Is this payment successful?"
- Hubtel calls you back (Callback) = "Yes, payment received!"

### What is "Transaction Status Check"?

Sometimes Hubtel's message gets lost.

**Solution:** You ask Hubtel "Hey, was this payment successful?"

**Your website does this automatically:**
- After 5 minutes with no confirmation
- Asks Hubtel about the payment status
- If payment is there, creates the order

---

## ⚠️ IMPORTANT THINGS TO REMEMBER

### Security 🔒

1. **NEVER share** your Hubtel API credentials
   - They're like your password
   - Currently: pQGpB7y and 14fda6847ee44c8fa910f355675cce73
   - Keep them SECRET

2. **ALWAYS use HTTPS** (not HTTP)
   - Your website must start with `https://`
   - Not `http://`

3. **Never let customers change amounts**
   - The website sets the price
   - Customer can't change it

### Verification ✅

1. **Always verify orders**
   - In admin panel, check all payment amounts
   - Make sure they match invoices

2. **Always keep receipts**
   - Hubtel sends confirmation emails
   - Save them for accounting

3. **Always test thoroughly**
   - Don't go live until tests pass
   - Use test payments first

---

## ❓ FAQ (Frequently Asked Questions)

### Q: Will customers be charged during testing?
**A:** No! Use the TEST credentials Hubtel provides. No real money changes hands.

### Q: How long does payment take?
**A:** Usually instant! Funds appear in your account within 1 minute.

### Q: What if a customer's payment fails?
**A:** No order is created. Customer can try again. You're not charged anything.

### Q: Can customers get refunds?
**A:** Yes! Contact Hubtel to process refund. They reverse the payment.

### Q: What payment methods do customers get?
**A:** 
- MTN Mobile Money 
- Telecel Cash
- AirtelTigo Money
- Visa Card
- MasterCard
- GH-QR

### Q: Do I need a bank account?
**A:** Yes! You need a **Hubtel merchant account** (which you have).

### Q: How much does Hubtel charge?
**A:** You'll see in your Hubtel dashboard. Usually a small percentage per transaction.

### Q: Can I use Hubtel on my phone?
**A:** Yes! Customers can use their phones to pay. Website works on mobile.

### Q: What if I need help?
**A:** Contact Hubtel: developers.hubtel.com or your relationship manager.

---

## 📞 SUPPORT CONTACTS

### If Something Goes Wrong:

**Technical Issues:**
- Your Developer (if you have one)
- Contact: [Developer Email]

**Hubtel Issues:**
- Hubtel Support: developers.hubtel.com
- Hubtel Phone: +233 [number - get from dashboard]
- Email: support@hubtel.com

**Your Business:**
- FMM CLASSICO: fmmclassico@gmail.com
- Phone: 0509896035

---

## ✨ SUCCESS CHECKLIST

Before you go LIVE (go public), make sure:

- [ ] You've tested payment with test credentials
- [ ] Orders appear in your admin dashboard
- [ ] Customer receives confirmation email
- [ ] You receive notification email
- [ ] All 3 test scenarios pass (success, fail, cancel)
- [ ] Screenshots collected
- [ ] Documentation sent to Hubtel
- [ ] Hubtel says "OK to go live"
- [ ] Your website is on HTTPS (not HTTP)
- [ ] You have live merchant account from Hubtel

---

## 🎉 CONGRATULATIONS!

You now have a complete **online payment system**! 

**This means:**
- ✅ Customers can shop online
- ✅ Customers can pay directly
- ✅ Orders are created automatically
- ✅ You get money instantly
- ✅ Business grows! 📈

---

## 📅 TIMELINE

| Timeline | What Happens |
|----------|--------------|
| **Today** | Integration complete |
| **Day 1-3** | Test and collect screenshots |
| **Day 4** | Send to Hubtel |
| **Day 5-7** | Hubtel tests with you (UAT) |
| **Day 8** | Get approval to go live |
| **Day 9** | Switch to live merchant account |
| **Day 10+** | Accept real customer payments! 🚀 |

---

## 🔗 USEFUL LINKS

- Hubtel Developers: https://developers.hubtel.com
- Your Dashboard: https://www.fmmclassico.com/AdminOrders
- Your Website: https://www.fmmclassico.com
- GitHub: [Your repo URL]

---

## 💡 QUICK REFERENCE

**Merchant Account:** 2039285  
**API Status:** ✅ Connected  
**Test Status:** ⏳ Awaiting Hubtel test credentials  
**UAT Status:** ⏳ Ready to schedule  
**Go-Live Status:** ⏳ Pending UAT approval  

---

**Document Created:** June 17, 2026  
**For:** Non-Technical Team Members  
**Questions?** See the other documentation files in `/docs/` folder

**Remember:** You don't need to be a programmer. You just need to:
1. Test it
2. Send documentation to Hubtel
3. Wait for approval
4. Go live!

That's it! 🎊
