// src/services/helpers.js
export function formatMonthYear(monthId) {
  if (!monthId) return "";
  const [year, month] = monthId.split('-');
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
}

export function formatNumber(value) {
  const num = Number(value);
  if (isNaN(num) || num === 0) return "";
  return num.toLocaleString();
}

export function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

export function capitalizeFirstLetter(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function nombreEnLettres(n) {
  if (n === 0) return "zéro";
  const unite = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const dizaine = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  function convertLessThanThousand(num) {
    if (num === 0) return "";
    let result = "";
    let hundred = Math.floor(num / 100);
    let remainder = num % 100;
    if (hundred > 0) {
      if (hundred === 1) result += "cent";
      else result += unite[hundred] + " cent";
      if (remainder > 0) result += " ";
    }
    if (remainder > 0) {
      if (remainder < 20) {
        result += unite[remainder];
      } else {
        let ten = Math.floor(remainder / 10);
        let unit = remainder % 10;
        if (ten === 7) {
          if (unit === 0) result += "soixante-dix";
          else if (unit === 1) result += "soixante et onze";
          else result += "soixante-" + unite[unit + 10];
        } else if (ten === 8) {
          if (unit === 0) result += "quatre-vingts";
          else if (unit === 1) result += "quatre-vingt-un";
          else result += "quatre-vingt-" + unite[unit];
        } else if (ten === 9) {
          if (unit === 0) result += "quatre-vingt-dix";
          else if (unit === 1) result += "quatre-vingt-onze";
          else result += "quatre-vingt-" + unite[unit + 10];
        } else {
          result += dizaine[ten];
          if (unit === 1) result += " et un";
          else if (unit > 0) result += "-" + unite[unit];
        }
      }
    }
    return result.trim();
  }

  function convert(num) {
    if (num < 1000) return convertLessThanThousand(num);
    if (num < 1000000) {
      let milliers = Math.floor(num / 1000);
      let reste = num % 1000;
      let milliersStr = milliers === 1 ? "mille" : convertLessThanThousand(milliers) + "-mille";
      if (reste === 0) return milliersStr;
      return milliersStr + "-" + convertLessThanThousand(reste);
    }
    let millions = Math.floor(num / 1000000);
    let reste = num % 1000000;
    let millionsStr = convertLessThanThousand(millions) + "-million" + (millions > 1 ? "s" : "");
    if (reste === 0) return millionsStr;
    return millionsStr + "-" + convert(reste);
  }

  return convert(n);
}

export function nombreEnLettresCapitalized(n) {
  const letters = nombreEnLettres(n);
  if (!letters) return '';
  return letters.charAt(0).toUpperCase() + letters.slice(1);
}