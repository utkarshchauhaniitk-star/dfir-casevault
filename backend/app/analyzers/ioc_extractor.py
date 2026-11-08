import re
import ipaddress
from typing import List, Dict

# Regex patterns
IPV4_REGEX = re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b')
EMAIL_REGEX = re.compile(r'\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b')
URL_REGEX = re.compile(r'https?://(?:[a-zA-Z0-9\-._~:/?#\[\]@!$&\'()*+,;=]|%[0-9a-fA-F]{2})+')
SHA256_REGEX = re.compile(r'\b[a-fA-F0-9]{64}\b')
DOMAIN_REGEX = re.compile(r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|edu|gov|io|ru|cn|xyz|top|biz|info|cc|co|me|online|site|club|vip|live)\b', re.IGNORECASE)

KNOWN_CODE_EXTENSIONS = {'csv', 'json', 'log', 'txt', 'png', 'jpg', 'jpeg', 'pdf', 'zip', 'py', 'ts', 'js', 'html', 'css', 'md'}

def is_valid_ipv4(ip_str: str) -> bool:
    try:
        ip = ipaddress.IPv4Address(ip_str)
        # Accept valid addresses
        return True
    except (ipaddress.AddressValueError, ValueError):
        return False

def is_valid_domain(domain_str: str) -> bool:
    domain_lower = domain_str.lower()
    tld = domain_lower.rsplit('.', 1)[-1]
    if tld in KNOWN_CODE_EXTENSIONS:
        return False
    # Check length and dots
    if len(domain_str) > 253 or '.' not in domain_str:
        return False
    return True

def extract_iocs_from_text(text: str) -> List[Dict[str, str]]:
    """
    Extracts Indicators of Compromise safely without making outbound network requests.
    Validates candidates before inclusion.
    """
    findings = []
    seen = set()

    # 1. SHA-256
    for match in SHA256_REGEX.finditer(text):
        val = match.group(0).lower()
        if val not in seen and not val.startswith("0000000000000000"):
            seen.add(val)
            findings.append({
                "ioc_type": "SHA-256",
                "value": val,
                "context": f"Found SHA-256 candidate string at offset {match.start()}",
                "status": "Extracted"
            })

    # 2. IPv4
    for match in IPV4_REGEX.finditer(text):
        val = match.group(0)
        if is_valid_ipv4(val) and val not in seen:
            seen.add(val)
            try:
                ip_obj = ipaddress.IPv4Address(val)
                context_type = "Private/Internal IP" if ip_obj.is_private else "Public IP"
                status = "Unverified" if ip_obj.is_private else "Needs Review"
            except Exception:
                context_type = "IP Candidate"
                status = "Extracted"

            findings.append({
                "ioc_type": "IPv4",
                "value": val,
                "context": f"{context_type} at offset {match.start()}",
                "status": status
            })

    # 3. URLs
    for match in URL_REGEX.finditer(text):
        raw_val = match.group(0)
        # Strip trailing punctuation
        clean_url = raw_val.rstrip('.,;()[]"\'')
        if clean_url not in seen:
            seen.add(clean_url)
            findings.append({
                "ioc_type": "URL",
                "value": clean_url,
                "context": f"URL string identified at offset {match.start()}",
                "status": "Needs Review"
            })

    # 4. Emails
    for match in EMAIL_REGEX.finditer(text):
        val = match.group(0).lower()
        if val not in seen:
            seen.add(val)
            findings.append({
                "ioc_type": "Email",
                "value": val,
                "context": f"Email address identified at offset {match.start()}",
                "status": "Extracted"
            })

    # 5. Domains
    for match in DOMAIN_REGEX.finditer(text):
        val = match.group(0).lower()
        if is_valid_domain(val) and val not in seen:
            # Check if domain is already part of an extracted email or URL
            if not any(val in item["value"].lower() for item in findings if item["ioc_type"] in ("Email", "URL")):
                seen.add(val)
                findings.append({
                    "ioc_type": "Domain",
                    "value": val,
                    "context": f"Domain candidate at offset {match.start()}",
                    "status": "Needs Review"
                })

    return findings
