package com.sekai.game.service;

import com.sekai.game.entity.DuelRecord;
import com.sekai.game.entity.User;
import com.sekai.game.repository.DuelRecordRepository;
import com.sekai.game.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DuelRecordService {

    @Autowired
    private DuelRecordRepository duelRecordRepository;

    @Autowired
    private UserRepository userRepository;

    public List<DuelRecord> getUserRecords(Long userId) {
        return duelRecordRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public DuelRecord recordDuel(Long userId, String result, String opponentType,
                                  String opponentName, String deckUsedId,
                                  int lpRemaining, int turnsPlayed,
                                  int damageDealt, int damageReceived, int coinsEarned) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));

        DuelRecord record = new DuelRecord();
        record.setUser(user);
        record.setResult(result);
        record.setOpponentType(opponentType);
        record.setOpponentName(opponentName);
        record.setDeckUsedId(deckUsedId);
        record.setLpRemaining(lpRemaining);
        record.setTurnsPlayed(turnsPlayed);
        record.setDamageDealt(damageDealt);
        record.setDamageReceived(damageReceived);
        record.setCoinsEarned(coinsEarned);

        user.setDuelsPlayed(valueOrZero(user.getDuelsPlayed()) + 1);
        if ("win".equals(result)) {
            user.setWins(valueOrZero(user.getWins()) + 1);
        } else if ("loss".equals(result)) {
            user.setLosses(valueOrZero(user.getLosses()) + 1);
        } else {
            user.setDraws(valueOrZero(user.getDraws()) + 1);
        }
        long nextCoins = (long) valueOrZero(user.getDuelCoins()) + coinsEarned;
        user.setDuelCoins((int) Math.max(0, Math.min(Integer.MAX_VALUE, nextCoins)));
        userRepository.save(user);

        return duelRecordRepository.save(record);
    }

    public Map<String, Object> getUserDuelStats(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));

        Map<String, Object> stats = new HashMap<>();
        int totalDuels = valueOrZero(user.getDuelsPlayed());
        int wins = valueOrZero(user.getWins());
        int losses = valueOrZero(user.getLosses());
        int draws = valueOrZero(user.getDraws());
        stats.put("totalDuels", totalDuels);
        stats.put("wins", wins);
        stats.put("losses", losses);
        stats.put("draws", draws);
        stats.put("winRate", totalDuels > 0
            ? (double) wins / totalDuels * 100
            : 0);
        return stats;
    }

    public List<Object[]> getLeaderboard() {
        return duelRecordRepository.findTopWinners(PageRequest.of(0, 10));
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}
