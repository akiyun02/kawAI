import json
import math

print("=== STRICT CANONICAL VALIDATION CHECKLIST ===")

# Test cases: (targetSign, thumb, index, middle, ring, pinky, extra)
# Verifies the exact logic translated from recognitionEngine.ts

def passes_canonical(sign_id, t_ext, i_ext, m_ext, r_ext, p_ext, is_thumb_across, spread_ratio, thumb_dist_to_index, palm_height):
    issues = []
    passes = True
    
    if sign_id == 'A':
        if i_ext or m_ext or r_ext or p_ext:
            passes = False
            issues.append("Curl all 4 fingers")
        elif is_thumb_across:
            passes = False
            issues.append("Rest thumb along index")
        elif t_ext:
            passes = False
            issues.append("Keep thumb resting against index")
            
    elif sign_id == 'B':
        if not (i_ext and m_ext and r_ext and p_ext):
            passes = False
            issues.append("Extend all 4 fingers")
        elif spread_ratio > 0.40:
            passes = False
            issues.append("Keep fingers pressed together (not spread like 4)")
        elif t_ext:
            passes = False
            issues.append("Fold thumb across palm")
            
    elif sign_id == '4':
        if not (i_ext and m_ext and r_ext and p_ext):
            passes = False
            issues.append("Extend all 4 fingers")
        elif spread_ratio < 0.38:
            passes = False
            issues.append("Spread 4 fingers apart (fingers together like B)")
        elif t_ext:
            passes = False
            issues.append("Tuck thumb across palm")
            
    elif sign_id == '5':
        if not (i_ext and m_ext and r_ext and p_ext and t_ext):
            passes = False
            issues.append("Extend all 5 fingers")
        elif spread_ratio < 0.35:
            passes = False
            issues.append("Fan fingers wide apart")
            
    elif sign_id == 'D':
        if not i_ext:
            passes = False
            issues.append("Point index finger up")
        elif m_ext or r_ext or p_ext:
            passes = False
            issues.append("Curl middle, ring, pinky")
        elif t_ext:
            passes = False
            issues.append("Do not stick thumb out like L")
            
    elif sign_id == 'L':
        if not i_ext:
            passes = False
            issues.append("Point index up")
        elif not t_ext:
            passes = False
            issues.append("Extend thumb at 90 deg")
        elif m_ext or r_ext or p_ext:
            passes = False
            issues.append("Curl middle, ring, pinky")
            
    elif sign_id == 'V':
        if not (i_ext and m_ext):
            passes = False
            issues.append("Extend index and middle")
        elif r_ext or p_ext:
            passes = False
            issues.append("Curl ring and pinky")
        elif t_ext:
            passes = False
            issues.append("Hold thumb over ring and pinky")
            
    elif sign_id == 'W':
        if not (i_ext and m_ext and r_ext):
            passes = False
            issues.append("Extend index, middle, ring")
        elif p_ext:
            passes = False
            issues.append("Curl pinky")
        elif t_ext:
            passes = False
            issues.append("Tuck thumb over pinky")
            
    elif sign_id == 'Y':
        if not (t_ext and p_ext):
            passes = False
            issues.append("Extend thumb and pinky")
        elif i_ext or m_ext or r_ext:
            passes = False
            issues.append("Curl index, middle, ring")
            
    elif sign_id == 'LOVE':
        if not (t_ext and i_ext and p_ext):
            passes = False
            issues.append("Extend thumb, index, pinky")
        elif m_ext or r_ext:
            passes = False
            issues.append("Curl middle and ring")

    return passes, issues

# Test 1: User signs '4' (spread=0.48, thumb tucked) against target 'B'
p, iss = passes_canonical('B', t_ext=False, i_ext=True, m_ext=True, r_ext=True, p_ext=True, is_thumb_across=True, spread_ratio=0.48, thumb_dist_to_index=0.2, palm_height=0.18)
assert p == False, "Target B should reject spread fingers (which is 4)!"
print("Test 1 Passed: Target 'B' rejects spread fingers ('4') ->", iss[0])

# Test 2: User signs 'B' (spread=0.25, thumb tucked) against target '4'
p, iss = passes_canonical('4', t_ext=False, i_ext=True, m_ext=True, r_ext=True, p_ext=True, is_thumb_across=True, spread_ratio=0.25, thumb_dist_to_index=0.2, palm_height=0.18)
assert p == False, "Target 4 should reject pressed blade fingers (which is B)!"
print("Test 2 Passed: Target '4' rejects pressed blade fingers ('B') ->", iss[0])

# Test 3: User signs '5' (thumb open, spread=0.45) against target '4'
p, iss = passes_canonical('4', t_ext=True, i_ext=True, m_ext=True, r_ext=True, p_ext=True, is_thumb_across=False, spread_ratio=0.45, thumb_dist_to_index=0.4, palm_height=0.18)
assert p == False, "Target 4 should reject open thumb (which is 5)!"
print("Test 3 Passed: Target '4' rejects open thumb ('5') ->", iss[0])

# Test 4: User signs 'L' (thumb out, index up) against target 'D'
p, iss = passes_canonical('D', t_ext=True, i_ext=True, m_ext=False, r_ext=False, p_ext=False, is_thumb_across=False, spread_ratio=0.1, thumb_dist_to_index=0.5, palm_height=0.18)
assert p == False, "Target D should reject extended thumb (which is L)!"
print("Test 4 Passed: Target 'D' rejects extended thumb ('L') ->", iss[0])

# Test 5: User signs 'W' (3 fingers up) against target 'V' (2 fingers up)
p, iss = passes_canonical('V', t_ext=False, i_ext=True, m_ext=True, r_ext=True, p_ext=False, is_thumb_across=False, spread_ratio=0.3, thumb_dist_to_index=0.2, palm_height=0.18)
assert p == False, "Target V should reject 3 fingers ('W')!"
print("Test 5 Passed: Target 'V' rejects 3 fingers ('W') ->", iss[0])

# Test 6: User signs 'Y' (thumb & pinky) against target 'LOVE' (thumb, index, pinky)
p, iss = passes_canonical('LOVE', t_ext=True, i_ext=False, m_ext=False, r_ext=False, p_ext=True, is_thumb_across=False, spread_ratio=0.3, thumb_dist_to_index=0.4, palm_height=0.18)
assert p == False, "Target LOVE should reject Y (missing index)!"
print("Test 6 Passed: Target 'LOVE' rejects 'Y' (missing index) ->", iss[0])

# Test 7: Correct 'LOVE'
p, iss = passes_canonical('LOVE', t_ext=True, i_ext=True, m_ext=False, r_ext=False, p_ext=True, is_thumb_across=False, spread_ratio=0.3, thumb_dist_to_index=0.4, palm_height=0.18)
assert p == True, "Clean LOVE should pass!"
print("Test 7 Passed: Target 'LOVE' correctly accepts clean ILY posture!")

print("\nALL CANONICAL KINEMATIC DISCRIMINATION TESTS PASSED 100%!")
