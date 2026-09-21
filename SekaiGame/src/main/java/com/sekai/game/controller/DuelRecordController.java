package com.sekai.game.controller;

import com.sekai.game.entity.DuelRecord;
import com.sekai.game.service.DuelRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/duels")
public class DuelRecordController {

    @Autowired
    private DuelRecordService duelRecordService;

    @GetMapping("/user/{userId}")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<?> getUserRecords(@PathVariable Long userId) {
        return ResponseEntity.ok(duelRecordService.getUserRecords(userId));
    }

    @PostMapping("/user/{userId}")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<?> recordDuel(@PathVariable Long userId, @RequestBody Map<String, Object> body) {
        try {
            if (body == null) throw new IllegalArgumentException("对局数据不能为空");
            String result = text(body, "result", "draw");
            if (!List.of("win", "loss", "draw").contains(result)) {
                throw new IllegalArgumentException("对局结果无效");
            }
            String opponentType = text(body, "opponentType", "ai");
            if (!List.of("ai", "training", "pvp").contains(opponentType)) {
                throw new IllegalArgumentException("对手类型无效");
            }
            String opponentName = text(body, "opponentName", "AI");
            if (opponentName.length() > 50) throw new IllegalArgumentException("对手名称过长");
            String deckUsedId = body.get("deckUsedId") instanceof String value ? value : null;
            int lpRemaining = number(body, "lpRemaining", 0, 0, 8000);
            int turnsPlayed = number(body, "turnsPlayed", 0, 0, 10000);
            int damageDealt = number(body, "damageDealt", 0, 0, 1000000);
            int damageReceived = number(body, "damageReceived", 0, 0, 1000000);
            int coinsEarned;
            if ("pvp".equals(opponentType)) {
                coinsEarned = "win".equals(result) ? 1000 : ("loss".equals(result) ? -333 : 0);
            } else if ("training".equals(opponentType)) {
                coinsEarned = 0;
            } else {
                coinsEarned = switch (result) {
                    case "win" -> 120;
                    case "loss" -> 50;
                    default -> 60;
                };
            }

            DuelRecord record = duelRecordService.recordDuel(
                userId, result, opponentType, opponentName, deckUsedId,
                lpRemaining, turnsPlayed, damageDealt, damageReceived, coinsEarned
            );
            return ResponseEntity.ok(Map.of(
                "success", true,
                "recordId", record.getId(),
                "duelCoins", record.getUser().getDuelCoins()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("reason", e.getMessage()));
        }
    }

    private String text(Map<String, Object> body, String key, String fallback) {
        Object value = body.get(key);
        return value instanceof String text && !text.isBlank() ? text.trim() : fallback;
    }

    private int number(Map<String, Object> body, String key, int fallback, int min, int max) {
        Object value = body.get(key);
        if (!(value instanceof Number number)) return fallback;
        return Math.max(min, Math.min(max, number.intValue()));
    }

    @GetMapping("/user/{userId}/stats")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<?> getUserDuelStats(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(duelRecordService.getUserDuelStats(userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("reason", e.getMessage()));
        }
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<?> getLeaderboard() {
        return ResponseEntity.ok(duelRecordService.getLeaderboard());
    }
}
