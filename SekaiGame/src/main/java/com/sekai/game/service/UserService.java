package com.sekai.game.service;

import com.sekai.game.entity.Card;
import com.sekai.game.entity.User;
import com.sekai.game.entity.UserCard;
import com.sekai.game.repository.CardRepository;
import com.sekai.game.repository.UserCardRepository;
import com.sekai.game.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserCardRepository userCardRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private StarterDeckService starterDeckService;

    @Transactional
    public User register(String username, String password, String nickname) {
        String normalizedUsername = requireText(username, "用户名", 3, 50);
        if (password == null || password.length() < 8 || password.length() > 128) {
            throw new IllegalArgumentException("密码长度必须为8至128位");
        }
        String normalizedNickname = nickname == null || nickname.isBlank()
            ? normalizedUsername
            : requireText(nickname, "昵称", 1, 100);
        if (userRepository.existsByUsername(normalizedUsername)) {
            throw new RuntimeException("用户名已存在");
        }
        User user = new User();
        user.setUsername(normalizedUsername);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(normalizedNickname);
        User savedUser = userRepository.save(user);

        List<Card> starterCards = cardRepository.findBySeriesAndEnabledTrue(StarterDeckService.STARTER_SERIES);
        starterDeckService.resetToStarterCollection(savedUser, starterCards);
        return savedUser;
    }

    public Optional<User> login(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return Optional.empty();
        }
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent() && passwordEncoder.matches(password, userOpt.get().getPassword())) {
            User user = userOpt.get();
            user.setLastLoginAt(java.time.LocalDateTime.now());
            userRepository.save(user);
            return Optional.of(user);
        }
        return Optional.empty();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional
    public User updateUser(Long userId, Map<String, Object> updates) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));

        if (updates == null) throw new IllegalArgumentException("更新数据不能为空");
        if (updates.containsKey("nickname")) {
            user.setNickname(requireText(asString(updates.get("nickname"), "昵称"), "昵称", 1, 100));
        }
        if (updates.containsKey("avatar")) {
            user.setAvatar(requireOptionalText(asString(updates.get("avatar"), "头像"), "头像", 255));
        }
        if (updates.containsKey("selectedDeckId")) {
            user.setSelectedDeckId(requireOptionalText(asString(updates.get("selectedDeckId"), "卡组ID"), "卡组ID", 50));
        }
        if (updates.containsKey("settingsJson")) {
            user.setSettingsJson(requireOptionalText(asString(updates.get("settingsJson"), "设置"), "设置", 10000));
        }

        return userRepository.save(user);
    }

    @Transactional
    public User updateDuelCoins(Long userId, int delta) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
        long next = (long) (user.getDuelCoins() == null ? 0 : user.getDuelCoins()) + delta;
        user.setDuelCoins((int) Math.max(0, Math.min(Integer.MAX_VALUE, next)));
        return userRepository.save(user);
    }

    public List<UserCard> getUserCards(Long userId) {
        return userCardRepository.findByUserId(userId);
    }

    @Transactional
    public UserCard addCardToUser(Long userId, String cardId, int count) {
        if (count <= 0 || count > 100) throw new IllegalArgumentException("卡牌数量无效");
        Card card = cardRepository.findById(cardId)
            .filter(item -> Boolean.TRUE.equals(item.getEnabled()))
            .orElseThrow(() -> new IllegalArgumentException("卡牌不存在或已禁用"));
        Optional<UserCard> existing = userCardRepository.findByUserIdAndCardId(userId, cardId);
        if (existing.isPresent()) {
            UserCard uc = existing.get();
            uc.setCount(Math.min(uc.getCount() + count, 3));
            return userCardRepository.save(uc);
        } else {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
            UserCard uc = new UserCard();
            uc.setUser(user);
            uc.setCard(card);
            uc.setCount(Math.min(count, 3));
            return userCardRepository.save(uc);
        }
    }

    public Map<String, Object> getUserStats(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
        Map<String, Object> stats = new HashMap<>();
        stats.put("duelCoins", user.getDuelCoins());
        stats.put("packsOpened", user.getPacksOpened());
        stats.put("duelsPlayed", user.getDuelsPlayed());
        stats.put("wins", user.getWins());
        stats.put("losses", user.getLosses());
        stats.put("draws", user.getDraws());
        return stats;
    }

    public List<User> getLeaderboard() {
        return userRepository.findAll();
    }

    private String requireText(String value, String label, int min, int max) {
        if (value == null) throw new IllegalArgumentException(label + "不能为空");
        String normalized = value.trim();
        if (normalized.length() < min || normalized.length() > max) {
            throw new IllegalArgumentException(label + "长度必须为" + min + "至" + max + "位");
        }
        return normalized;
    }

    private String requireOptionalText(String value, String label, int max) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (normalized.length() > max) throw new IllegalArgumentException(label + "过长");
        return normalized;
    }

    private String asString(Object value, String label) {
        if (value == null) return null;
        if (!(value instanceof String text)) throw new IllegalArgumentException(label + "格式错误");
        return text;
    }
}
