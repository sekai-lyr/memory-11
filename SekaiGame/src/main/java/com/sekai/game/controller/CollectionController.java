package com.sekai.game.controller;

import com.sekai.game.service.CollectionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/collection")
public class CollectionController {

    @Autowired
    private CollectionService collectionService;

    @GetMapping("/{userId}")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<List<Map<String, Object>>> getUserCollection(@PathVariable Long userId) {
        return ResponseEntity.ok(collectionService.getUserCollection(userId));
    }

    @GetMapping("/{userId}/stats")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<Map<String, Object>> getCollectionStats(@PathVariable Long userId) {
        return ResponseEntity.ok(collectionService.getCollectionStats(userId));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> saveCollection(@PathVariable Long userId, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(collectionService.saveCollection(userId, body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "reason", e.getMessage()));
        }
    }

    @PostMapping("/{userId}/pack")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<?> openPack(@PathVariable Long userId, @RequestBody Map<String, Object> body) {
        if (body == null) return ResponseEntity.badRequest().body(Map.of("success", false, "reason", "请求数据不能为空"));
        String packType = body.get("packType") instanceof String value ? value : "nightcord";
        Object countValue = body.get("count");
        int count = countValue instanceof Number number ? number.intValue() : 8;
        return ResponseEntity.ok(collectionService.openPack(userId, packType, count));
    }

    @PostMapping("/{userId}/craft")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<?> craftCard(@PathVariable Long userId, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(collectionService.craftCard(userId, cardId(body)));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "reason", exception.getMessage()));
        }
    }

    @PostMapping("/{userId}/dismantle")
    @PreAuthorize("@userAccess.isCurrentUser(#userId)")
    public ResponseEntity<?> dismantleCard(@PathVariable Long userId, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(collectionService.dismantleCard(userId, cardId(body)));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "reason", exception.getMessage()));
        }
    }

    private String cardId(Map<String, Object> body) {
        if (body == null || !(body.get("cardId") instanceof String cardId) || cardId.isBlank()) {
            throw new IllegalArgumentException("卡牌ID不能为空");
        }
        return cardId.trim();
    }
}
