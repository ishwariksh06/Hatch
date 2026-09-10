const fs = require('fs');
const path = require('path');

const items = [
  { name: "creamy-white-sauce-pasta", title: "Creamy White Sauce Pasta", url: "https://pin.it/4oey5Yynx" },
  { name: "cheesy-garlic-bread", title: "Cheesy Garlic Bread (4 pcs)", url: "https://pin.it/1Qn38NWD8" },
  { name: "farmhouse-veggie-pizza", title: "Farmhouse Veggie Pizza (8-inch)", url: "https://pin.it/63piEYyCe" },
  { name: "crispy-aloo-tikki-burger", title: "Crispy Aloo Tikki Burger", url: "https://pin.it/3xpUzC3A8" },
  { name: "spicy-chicken-arrabbiata-pasta", title: "Spicy Chicken Arrabbiata Pasta", url: "https://pin.it/3HkiEAAuY" },
  { name: "chicken-keema-garlic-bread", title: "Chicken Keema Garlic Bread", url: "https://pin.it/6VcizANEO" },
  { name: "bbq-chicken-delight-pizza", title: "BBQ Chicken Delight Pizza (8-inch)", url: "https://pin.it/4Ly3ue9lZ" },
  { name: "crispy-fried-chicken-burger", title: "Crispy Fried Chicken Burger", url: "https://pin.it/63GtulqgY" },
  { name: "dal-tadka-with-steamed-rice-bowl", title: "Dal Tadka with Steamed Rice Bowl", url: "https://pin.it/34fkt9VAV" },
  { name: "rajma-chawal-bowl", title: "Rajma Chawal Bowl", url: "https://pin.it/2dVbbvy59" },
  { name: "paneer-butter-masala-2-naan", title: "Paneer Butter Masala + 2 Naan", url: "https://pin.it/4u8viPwjU" },
  { name: "butter-tandoori-roti", title: "Butter Tandoori Roti (2 pcs)", url: "https://pin.it/50GZhmk78" },
  { name: "dum-chicken-biryani-bowl", title: "Dum Chicken Biryani Bowl", url: "https://pin.it/6YExKiExh" },
  { name: "paneer-tikka-frankie", title: "Paneer Tikka Frankie", url: "https://pin.it/6afTrZWeF" },
  { name: "butter-masala-dosa", title: "Butter Masala Dosa", url: "https://pin.it/5q3Zhf4oD" },
  { name: "idli-vada-combo", title: "Idli-Vada Combo", url: "https://pin.it/2trkwASwK" },
  { name: "double-cheese-masala-maggi", title: "Double Cheese Masala Maggi", url: "https://pin.it/5rxu59Gbc" },
  { name: "chicken-kathi-roll", title: "Chicken Kathi Roll", url: "https://pin.it/5h9ov7Wbx" },
  { name: "mumbai-egg-bhurji-pav", title: "Mumbai Egg Bhurji Pav (2 Pav)", url: "https://pin.it/2CLdhnF8g" },
  { name: "coca-cola-can", title: "Coca-Cola Can (300ml)", url: "https://pin.it/46EpqGGT0" },
  { name: "thums-up-can", title: "Thums Up Can (300ml)", url: "https://pin.it/4apwjuBe8" },
  { name: "monster-energy-drink", title: "Monster Energy Drink (350ml)", url: "https://pin.it/jQ35zTKYR" },
  { name: "adrak-elaichi-cutting-chai", title: "Adrak Elaichi Cutting Chai", url: "https://pin.it/4Tf3QKcTg" },
  { name: "cold-coffee-with-ice-cream", title: "Cold Coffee with Ice Cream", url: "https://pin.it/xKgAmtqvB" },
  { name: "chocolate-brownie-with-ice-cream", title: "Chocolate Brownie with Ice Cream", url: "https://pin.it/fIWns8aHk" },
  { name: "dal-makhani-2-butter-kulcha", title: "Dal Makhani & 2 Butter Kulcha", url: "https://pin.it/1xLy6Mc6B" },
  { name: "butter-chicken-roll", title: "Butter Chicken Roll", url: "https://pin.it/56Lv1ar21" },
  { name: "pav-bhaji-platter", title: "Pav Bhaji Platter (Extra Butter)", url: "https://pin.it/3UyIEm6I2" },
  { name: "chicken-keema-pav", title: "Chicken Keema Pav (2 Pav)", url: "https://pin.it/1ZKavHI5I" },
  { name: "hakka-noodles-chilli-paneer", title: "Hakka Noodles + Chilli Paneer", url: "https://pin.it/5wOJiJLH2" },
  { name: "fried-rice-chilli-chicken", title: "Fried Rice + Chilli Chicken", url: "https://pin.it/1J0DayVoR" },
  { name: "mysore-masala-dosa", title: "Mysore Masala Dosa (Ghee Roast)", url: "https://pin.it/2xjc7yo6c" },
  { name: "andhra-chicken-roast-with-parotta", title: "Andhra Chicken Roast with Parotta", url: "https://pin.it/4sPZQC7tW" },
  { name: "paneer-tikka-pizza", title: "Paneer Tikka Pizza (10-inch)", url: "https://pin.it/62Fwc4xSc" },
  { name: "chicken-shawarma-loaded-fries", title: "Chicken Shawarma Loaded Fries", url: "https://pin.it/5QZng6H3C" },
  { name: "veg-dum-biryani-paneer-65", title: "Veg Dum Biryani + Paneer 65", url: "https://pin.it/2EQEHUIzW" },
  { name: "special-mutton-dum-biryani", title: "Special Mutton Dum Biryani", url: "https://pin.it/4RhQ7NUN2" },
  { name: "loaded-nachos-grande", title: "Loaded Nachos Grande", url: "https://pin.it/3sfQMyQHb" },
  { name: "crispy-chicken-wings", title: "Crispy Chicken Wings (6 pcs)", url: "https://pin.it/CR1326Yu5" }
];

const outputDir = path.join(__dirname, '..', 'hatch', 'public', 'food');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function extractImageUrl(html) {
  // Check for 736x or originals pinimg URLs
  const matches = [...html.matchAll(/https:\/\/i\.pinimg\.com\/(?:originals|736x|564x|1200x)\/[a-zA-Z0-9_\/.-]+\.(?:jpg|jpeg|png|webp)/gi)].map(m => m[0]);
  if (matches.length > 0) {
    // Prefer originals, then 736x, then others
    const originals = matches.find(m => m.includes('/originals/'));
    if (originals) return originals;
    const highRes = matches.find(m => m.includes('/736x/'));
    if (highRes) return highRes;
    return matches[0];
  }

  // Fallback: any pinimg link with extension
  const anyPinimg = html.match(/https:\/\/i\.pinimg\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/i);
  if (anyPinimg) return anyPinimg[0];

  return null;
}

async function downloadItem(item, index) {
  console.log(`[${index + 1}/${items.length}] Processing ${item.title}...`);
  try {
    const res = await fetch(item.url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    const html = await res.text();
    let imgUrl = await extractImageUrl(html);

    if (!imgUrl) {
      console.warn(`  ❌ Could not find image for ${item.title}`);
      return { success: false, item: item.title, error: 'No image found' };
    }

    // Try upgrading 736x to originals if possible, or download directly
    console.log(`  Found URL: ${imgUrl}`);
    let imgRes = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!imgRes.ok && imgUrl.includes('/originals/')) {
      // Fallback to 736x
      imgUrl = imgUrl.replace('/originals/', '/736x/');
      imgRes = await fetch(imgUrl);
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const filePath = path.join(outputDir, `${item.name}.jpeg`);
    fs.writeFileSync(filePath, buffer);
    console.log(`  ✅ Saved to ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return { success: true, item: item.title, path: filePath, size: buffer.length };
  } catch (err) {
    console.error(`  ❌ Error processing ${item.title}:`, err.message);
    return { success: false, item: item.title, error: err.message };
  }
}

async function run() {
  console.log(`Starting download of ${items.length} images to ${outputDir}...`);
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const res = await downloadItem(items[i], i);
    results.push(res);
    // Small pause to avoid rate limiting
    await new Promise(r => setTimeout(r, 400));
  }

  const succeeded = results.filter(r => r.success);
  console.log(`\n🎉 Completed! Successfully downloaded ${succeeded.length}/${items.length} photos as JPEG.`);
}

run();
